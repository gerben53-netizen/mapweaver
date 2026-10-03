using System;
using System.IO;
using System.IO.Pipes;
using System.Net;
using System.Text;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using System.Security.Cryptography;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Windows.Forms;
using System.Drawing;
using System.Web.Script.Serialization;
using System.Collections.Generic;
using System.Reflection;
using Microsoft.Win32;

class LocalClient : WebClient {
    protected override WebRequest GetWebRequest(Uri address) { var r=base.GetWebRequest(address);r.Timeout=10000;return r; }
}
class Mapweaver : ApplicationContext {
    static string url, expected, root, pipeName;
    static bool test, noBrowser, debug;
    Form debugWindow;
    Label debugStatus;
    readonly string supervisor=Guid.NewGuid().ToString(), token=Guid.NewGuid().ToString("N")+Guid.NewGuid().ToString("N");
    readonly Control dispatch=new Control();
    readonly NotifyIcon tray;
    readonly ToolStripMenuItem status;
    readonly System.Windows.Forms.Timer timer=new System.Windows.Forms.Timer();
    readonly List<string> events=new List<string>();
    readonly Queue<string> pendingEvents=new Queue<string>();
    bool logSending;
    readonly object eventLock=new object();
    Process child;
    string instance, phase="Starting", ticket="", restartTicket="";
    bool polling, starting, closing, disposed, prompting;
    bool? pendingStop;
    NamedPipeServerStream pipe, discoveryPipe;
    static Dictionary<string,object> Json(string v) {return new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(v);}
    static string Text(Dictionary<string,object> v,string k) {return v.ContainsKey(k)&&v[k]!=null?v[k].ToString():"";}
    static Dictionary<string,object> Health() {using(var c=new LocalClient()){c.Proxy=null;return Json(c.DownloadString(url+"/api/v1/health"));}}
    static bool Matches(Dictionary<string,object> h) {return Text(h,"application")=="Mapweaver"&&Text(h,"dataKey")==expected;}
    Dictionary<string,object> Control(string action,string value=null) {
        using(var c=new LocalClient()) {
            c.Proxy=null;c.Headers["Content-Type"]="application/json";c.Headers["X-Mapweaver"]="1";
            c.Headers["X-Mapweaver-Instance"]=instance;c.Headers["X-Mapweaver-Control"]=token;
            return Json(c.UploadString(url+"/api/v1/lifecycle/control","POST",new JavaScriptSerializer().Serialize(new {action=action,@event=value,confirmed=action=="release-tabs"})));
        }
    }
    void Log(string value) {
        lock(eventLock){if(events.Count>=256)events.RemoveAt(0);events.Add(DateTime.UtcNow.ToString("o")+" "+value);if(pendingEvents.Count>=256)pendingEvents.Dequeue();pendingEvents.Enqueue(value);}
        if(instance!=null){
            lock(eventLock){if(logSending)return;logSending=true;}
            Task.Run(delegate{
                while(true){string item;lock(eventLock){if(pendingEvents.Count==0){logSending=false;return;}item=pendingEvents.Peek();}
                    try{Control("event",item);}catch{lock(eventLock){logSending=false;}return;}
                    lock(eventLock){if(pendingEvents.Count>0&&pendingEvents.Peek()==item)pendingEvents.Dequeue();}
                }
            });
        }
    }
    void SetStatus(string value){phase=value;status.Text=value;if(debugStatus!=null)debugStatus.Text=value;string text="Mapweaver — "+value;tray.Text=text.Substring(0,Math.Min(63,text.Length));}
    void OnUi(Action action){if(!disposed&&dispatch.IsHandleCreated)try{dispatch.BeginInvoke(action);}catch(InvalidOperationException){}}
    Mapweaver() {
        dispatch.CreateControl();
        var menu=new ContextMenuStrip();
        menu.Items.Add("Open Mapweaver",null,delegate{Open();});menu.Items.Add(new ToolStripSeparator());
        status=new ToolStripMenuItem("Starting"){Enabled=false};menu.Items.Add(status);
        menu.Items.Add("Restart Mapweaver",null,delegate{RequestStop(true);});
        menu.Items.Add("Stop Mapweaver",null,delegate{RequestStop(false);});
        menu.Items.Add("Keep Mapweaver running",null,delegate{Keep();});
        menu.Items.Add("Resolve blocked browser waits",null,delegate{ReleaseTabs();});
        menu.Items.Add("Diagnostics",null,delegate{Diagnostics();});
        tray=new NotifyIcon{Icon=Icon.ExtractAssociatedIcon(Application.ExecutablePath),Text="Mapweaver — Starting",ContextMenuStrip=menu,Visible=true};
        tray.DoubleClick+=delegate{Open();};timer.Interval=500;timer.Tick+=delegate{Poll();};timer.Start();
        if(debug){
            debugWindow=new Form{Text="Mapweaver lifecycle diagnostics",Width=550,Height=210,StartPosition=FormStartPosition.CenterScreen};
            debugStatus=new Label{Text="Starting",Left=20,Top=20,Width=490,Height=45};debugWindow.Controls.Add(debugStatus);
            var showMenu=new Button{Text="Tray menu",Left=20,Top=80,Width=180};showMenu.Click+=delegate{menu.Show(showMenu,new Point(0,showMenu.Height));};debugWindow.Controls.Add(showMenu);
            debugWindow.Controls.Add(new Label{Text="Debug view of the same supervisor and tray actions.",Left=20,Top=130,Width=490});
            debugWindow.FormClosing+=delegate(object sender,FormClosingEventArgs e){if(!disposed){e.Cancel=true;debugWindow.Hide();}};debugWindow.Show();
        }
        SystemEvents.SessionEnding+=SessionEnding;Log("supervisor-started");Task.Run(delegate{PipeLoop(true);});Task.Run(delegate{PipeLoop(false);});Start();
    }
    void SessionEnding(object sender,SessionEndingEventArgs e){OnUi(delegate{RequestStop(false);});}
    async void Start() {
        if(starting||(child!=null&&!child.HasExited))return;
        starting=true;closing=false;instance=null;ticket="";restartTicket="";SetStatus("Starting");
        try {
            await Task.Run(delegate {
                try{var h=Health();throw new InvalidOperationException(Matches(h)?"A service is already running without this supervisor. Open its browser and stop it through Storage, then retry Restart. No process or lock was removed.":"The port belongs to another service or data directory.");}
                catch(WebException e){if(e.Status!=WebExceptionStatus.ConnectFailure)throw new InvalidOperationException("The port is occupied or healthcheck failed.");}
                string folder=AppDomain.CurrentDomain.BaseDirectory;
                var info=new ProcessStartInfo(Path.Combine(folder,"runtime","node.exe"),"\""+Path.Combine(folder,"dist-service","main.js")+"\""){WorkingDirectory=folder,UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden};
                info.EnvironmentVariables["MAPWEAVER_DATA_DIR"]=root;info.EnvironmentVariables["MAPWEAVER_SUPERVISOR_ID"]=supervisor;info.EnvironmentVariables["MAPWEAVER_CONTROL_TOKEN"]=token;
                child=Process.Start(info);var watch=Stopwatch.StartNew();
                while(watch.ElapsedMilliseconds<30000){
                    if(child.HasExited)throw new InvalidOperationException("Service could not start. Check runtime files, data permissions and port. See TROUBLESHOOTING.md.");
                    try{var h=Health();if(!Matches(h)||Text(h,"supervisorId")!=supervisor||Text(h,"pid")!=child.Id.ToString())throw new InvalidOperationException("Service identity mismatch. No process was replaced.");instance=Text(h,"instanceId");return;}
                    catch(WebException){Thread.Sleep(150);}
                }
                throw new InvalidOperationException("Startup timed out. The service was not killed. Use Diagnostics and retry Stop when healthy.");
            });
            SetStatus("Running on "+new Uri(url).Authority);Log("service-healthy");Log("supervisor-started");starting=false;Open();
        }catch(Exception e){if(test)Console.Error.WriteLine(e is InvalidOperationException ? e.Message : e.GetType().Name);SetStatus("Error — service unavailable");Log("unexpected-exit");if(!test)MessageBox.Show(e.Message,"Mapweaver",MessageBoxButtons.OK,MessageBoxIcon.Error);}
        finally{starting=false;if(pendingStop.HasValue){bool restart=pendingStop.Value;pendingStop=null;RequestStop(restart);}}
    }
    async void Open() {
        if(starting)return;
        try{
            var h=await Task.Run((Func<Dictionary<string,object>>)Health);if(!Matches(h))throw new Exception();
            if(noBrowser){Log("existing-instance");return;}
            try{Process.Start(new ProcessStartInfo(url){UseShellExecute=true,Verb="open"});Log("browser-opened");}
            catch{Log("browser-failed");ShowText("Open Mapweaver","Mapweaver is running. Copy this URL into your preferred browser:\r\n"+url);}
        }catch{if(!test)ShowText("Mapweaver","Service unavailable. Use Restart or Diagnostics in the tray menu.");}
    }
    async void RequestStop(bool restart) {
        if(starting){pendingStop=restart;return;}
        if(child==null||child.HasExited){if(restart)Start();else Exit();return;}
        try{
            var h=await Task.Run((Func<Dictionary<string,object>>)Health);
            if(!Matches(h)||Text(h,"supervisorId")!=supervisor||Text(h,"pid")!=child.Id.ToString())throw new Exception();
            instance=Text(h,"instanceId");var state=await Task.Run(delegate{return Control("stop");});
            if(restart){restartTicket=Text(state,"ticket");Log("restart-requested");}
            SetStatus("Stopping");ticket=Text(state,"ticket");ReviewWork(state);
        }catch{SetStatus("Error — stop not confirmed");if(!test)ShowText("Mapweaver could not stop","No writer was killed. Check Diagnostics and retry after active work finishes.");}
    }
    void ReviewWork(Dictionary<string,object> state) {
        var items=state["work"] as System.Collections.IList;if(prompting)return;if(items==null||items.Count==0||test){Proceed();return;}
        prompting=true;
        try{
            bool cancellable=false;var names=new List<string>();foreach(Dictionary<string,object> item in items){names.Add(Text(item,"kind"));cancellable |= (bool)item["cancellable"];}
            using(var dialog=new Form{Text="Mapweaver — active work",Width=540,Height=235,StartPosition=FormStartPosition.CenterScreen,FormBorderStyle=FormBorderStyle.FixedDialog,MaximizeBox=false,MinimizeBox=false}){
                dialog.Controls.Add(new Label{Text="Active: "+String.Join(", ",names)+"\r\nPending browser saves will finish before shutdown.",Left=20,Top=20,Width=485,Height=65});
                var wait=new Button{Text="Wait and stop when finished",Left=20,Top=95,Width=230,DialogResult=DialogResult.OK};dialog.Controls.Add(wait);
                var cancel=new Button{Text="Cancel operation and stop",Left=260,Top=95,Width=230,Enabled=cancellable,DialogResult=DialogResult.Abort};dialog.Controls.Add(cancel);
                var keep=new Button{Text="Keep Mapweaver running",Left=20,Top=140,Width=230,DialogResult=DialogResult.Cancel};dialog.Controls.Add(keep);dialog.CancelButton=keep;
                var result=dialog.ShowDialog();if(result==DialogResult.Cancel)Keep();else if(result==DialogResult.Abort)CancelWork();else Proceed();
            }
        }finally{prompting=false;}
    }
    async void ReleaseTabs(){
        if(test)return;
        if(MessageBox.Show("Only continue after closing other Mapweaver tabs and preserving their work. Unsynced browser edits have NOT been saved and may be lost. Recovery buffers will be kept.\n\nRelease browser waits and stop? This is allowed only after a stop timeout, with no active storage work.","Mapweaver — release browser waits",MessageBoxButtons.YesNo,MessageBoxIcon.Warning)!=DialogResult.Yes)return;
        try{await Task.Run(delegate{Control("release-tabs");});SetStatus("Stopping");}catch{ShowText("Mapweaver","Browser waits could not be released. Active work must finish first and Stop must have timed out. No writer was killed.");}
    }
    async void Proceed(){try{await Task.Run(delegate{Control("proceed");});}catch{SetStatus("Error — confirm Stop again");}}
    async void CancelWork(){try{await Task.Run(delegate{Control("cancel-work");Control("proceed");});}catch{SetStatus("Busy — wait for safe completion");}}
    async void Keep(){try{await Task.Run(delegate{Control("keep");});restartTicket="";ticket="";SetStatus("Running");}catch{SetStatus("Error — check Diagnostics");}}
    async void Poll() {
        if(polling||starting||disposed)return;polling=true;
        try{
            if(child!=null&&child.HasExited){
                if(child.ExitCode==0){Log("service-stopped");bool restart=restartTicket!="";child.Dispose();child=null;if(restart)Start();else Exit();}
                else{if(!phase.StartsWith("Error — service exited"))Log("unexpected-exit:"+child.ExitCode);SetStatus("Error — service exited ("+child.ExitCode+")");}return;
            }
            if(child==null)return;
            var h=await Task.Run((Func<Dictionary<string,object>>)Health);
            if(!Matches(h)||Text(h,"supervisorId")!=supervisor||Text(h,"pid")!=child.Id.ToString())throw new Exception();
            instance=Text(h,"instanceId");var state=(Dictionary<string,object>)h["lifecycle"];string p=Text(state,"phase");
            if(p=="closing"){closing=true;SetStatus("Stopping — database closing");}
            else if(p=="error")SetStatus("Error — stop timed out; no process killed");
            else if(p!="running"){SetStatus("Stopping — waiting for work / tabs");if(ticket!=Text(state,"ticket")){ticket=Text(state,"ticket");ReviewWork(state);}}
            else SetStatus((bool)h["maintenance"]?"Maintenance":"Running on "+new Uri(url).Authority);
        }catch{if(!closing)SetStatus("Error — service not responding");}
        finally{polling=false;}
    }
    void Diagnostics(){string text;lock(eventLock)text=String.Join("\r\n",events.ToArray());ShowText("Mapweaver diagnostics","Status: "+phase+"\r\n"+text+"\r\n\r\nWhen healthy, Storage & backups → Create diagnostics package includes service lifecycle events. No writer was killed.");}
    static void ShowText(string title,string message){
        if(test){Console.WriteLine(message);return;}
        using(var form=new Form{Text=title,Width=650,Height=360,StartPosition=FormStartPosition.CenterScreen}){form.Controls.Add(new TextBox{Multiline=true,ReadOnly=true,Text=message,Dock=DockStyle.Fill,ScrollBars=ScrollBars.Vertical});form.ShowDialog();}
    }
    static string ReadLineBounded(Stream stream){
        var bytes=new List<byte>();var one=new byte[1];var deadline=Stopwatch.StartNew();
        while(bytes.Count<160&&deadline.ElapsedMilliseconds<2000){var read=stream.ReadAsync(one,0,1);if(!read.Wait(Math.Max(1,2000-(int)deadline.ElapsedMilliseconds)))throw new IOException();if(read.Result==0)throw new IOException();if(one[0]==10)return Encoding.ASCII.GetString(bytes.ToArray());if(one[0]<32||one[0]>126)throw new IOException();bytes.Add(one[0]);}throw new IOException();
    }
    static void SendLine(Stream stream,string value){byte[] b=Encoding.UTF8.GetBytes(value+"\n");if(!stream.WriteAsync(b,0,b.Length).Wait(2000))throw new IOException();}
    void PipeLoop(bool discovery){
        var security=new PipeSecurity();security.SetAccessRuleProtection(true,false);
        security.AddAccessRule(new PipeAccessRule(new SecurityIdentifier(WellKnownSidType.NetworkSid,null),PipeAccessRights.FullControl,AccessControlType.Deny));
        security.AddAccessRule(new PipeAccessRule(WindowsIdentity.GetCurrent().User,PipeAccessRights.FullControl,AccessControlType.Allow));
        while(!disposed){try{using(var server=new NamedPipeServerStream(discovery?pipeName:pipeName+"-"+supervisor,PipeDirection.InOut,1,PipeTransmissionMode.Byte,PipeOptions.Asynchronous,256,256,security)){
            if(discovery)discoveryPipe=server;else pipe=server;server.WaitForConnection();SendLine(server,supervisor);if(discovery)continue;string command=ReadLineBounded(server),prefix=supervisor+" ";
            if(!command.StartsWith(prefix,StringComparison.Ordinal)){SendLine(server,"denied");continue;}
            string action=command.Substring(prefix.Length);
            if(action=="status")SendLine(server,phase.Replace("—","-"));
            else if(action=="open"||action=="stop"||action=="restart"){
                OnUi(delegate{if(action=="open"){Log("existing-instance");Open();}else RequestStop(action=="restart");});SendLine(server,"accepted");
            }else SendLine(server,"denied");
        }}catch{if(!disposed)Thread.Sleep(100);}}
    }
    static int Forward(string command){
        string id;
        using(var discovery=new NamedPipeClientStream(".",pipeName,PipeDirection.InOut,PipeOptions.Asynchronous)){discovery.Connect(5000);id=ReadLineBounded(discovery);}
        Guid parsed;if(!Guid.TryParse(id,out parsed))throw new IOException();
        using(var c=new NamedPipeClientStream(".",pipeName+"-"+id,PipeDirection.InOut,PipeOptions.Asynchronous)){
            c.Connect(5000);if(ReadLineBounded(c)!=id)throw new IOException();SendLine(c,id+" "+command);string result=ReadLineBounded(c);Console.WriteLine(result);return result=="denied"?1:0;
        }
    }
    void Exit(){disposed=true;timer.Stop();SystemEvents.SessionEnding-=SessionEnding;tray.Visible=false;tray.Dispose();if(pipe!=null)pipe.Dispose();if(discoveryPipe!=null)discoveryPipe.Dispose();if(debugWindow!=null)debugWindow.Dispose();dispatch.Dispose();ExitThread();}
    static void CreateShortcuts() {
        Type shellType=Type.GetTypeFromProgID("WScript.Shell");object shell=Activator.CreateInstance(shellType);
        string desktop=Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),folder=AppDomain.CurrentDomain.BaseDirectory;
        foreach(string name in new [] {"Mapweaver","Stop Mapweaver"}) {
            object link=shellType.InvokeMember("CreateShortcut",BindingFlags.InvokeMethod,null,shell,new object[]{Path.Combine(desktop,name+".lnk")});
            Type type=link.GetType();
            type.InvokeMember("TargetPath",BindingFlags.SetProperty,null,link,new object[]{Path.Combine(folder,"Mapweaver.exe")});
            type.InvokeMember("WorkingDirectory",BindingFlags.SetProperty,null,link,new object[]{folder});
            if(name.StartsWith("Stop"))type.InvokeMember("Arguments",BindingFlags.SetProperty,null,link,new object[]{"--stop"});
            type.InvokeMember("Save",BindingFlags.InvokeMethod,null,link,null);
        }
        MessageBox.Show("Open and Stop Mapweaver shortcuts were created on your desktop. Recreate them if you move the program folder.","Mapweaver");
    }
    [STAThread] static int Main(string[] args){
        debug=Array.IndexOf(args,"--debug")>=0;test=Array.IndexOf(args,"--test")>=0;noBrowser=Array.IndexOf(args,"--no-browser")>=0;
        try{
            if(Path.GetFileNameWithoutExtension(Application.ExecutablePath)=="Create shortcuts"){CreateShortcuts();return 0;}
            int port=47831;string value=Environment.GetEnvironmentVariable("MAPWEAVER_PORT");if(!String.IsNullOrEmpty(value)&&(!Int32.TryParse(value,out port)||port<1024||port>65535))throw new Exception();
            url="http://127.0.0.1:"+port;root=Environment.GetEnvironmentVariable("MAPWEAVER_DATA_DIR");if(String.IsNullOrEmpty(root))root=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Mapweaver");
            if(!Path.IsPathRooted(root))throw new Exception();root=Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar);
            string program=Path.GetFullPath(AppDomain.CurrentDomain.BaseDirectory).TrimEnd(Path.DirectorySeparatorChar);
            if(root.Equals(program,StringComparison.OrdinalIgnoreCase)||root.StartsWith(program+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new Exception();
            using(var sha=SHA256.Create())expected=BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(root.ToLowerInvariant()))).Replace("-","").ToLowerInvariant();
            pipeName="Mapweaver-"+WindowsIdentity.GetCurrent().User.Value+"-"+expected;
            var security=new MutexSecurity();security.SetAccessRuleProtection(true,false);security.AddAccessRule(new MutexAccessRule(WindowsIdentity.GetCurrent().User,MutexRights.FullControl,AccessControlType.Allow));bool created;
            using(var mutex=new Mutex(false,"Local\\"+pipeName,out created,security)){
                bool acquired=false;
                try{
                    try{acquired=mutex.WaitOne(0);}catch(AbandonedMutexException){acquired=true;}
                    string command=Array.IndexOf(args,"--stop")>=0?"stop":Array.IndexOf(args,"--restart")>=0?"restart":Array.IndexOf(args,"--status")>=0?"status":"open";
                    if(!acquired){
                        int result=Forward(command);
                        if(result==0&&command=="stop"&&Array.IndexOf(args,"--wait")>=0){
                            try{acquired=mutex.WaitOne(120000);}catch(AbandonedMutexException){mutex.ReleaseMutex();throw new Exception();}
                            if(!acquired)throw new Exception();
                        }
                        return result;
                    }
                    if(command=="stop"){
                        try{Health();throw new Exception();}catch(WebException e){if(e.Status==WebExceptionStatus.ConnectFailure)return 0;throw;}
                    }
                    if(command=="status")throw new Exception();
                    Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);Application.Run(new Mapweaver());
                }finally{if(acquired)mutex.ReleaseMutex();}
            }return 0;
        }catch(Exception error){if(test)Console.Error.WriteLine(error.GetType().Name);ShowText("Mapweaver could not complete the action","The supervisor could not start or receive the command. Check permissions, port, data directory and TROUBLESHOOTING.md. No running process or lock was removed.");return 1;}
    }
}
