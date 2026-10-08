import { beforeEach,expect,it,vi } from 'vitest'
import { fireEvent,render,screen,waitFor } from '@testing-library/react'
import { CampfirePublishingDialog } from './CampfirePublishingDialog'
import { api } from '../storage/api'
import { useProjectSession } from '../projects/session'
import { saveLocalProject } from '../projects/localSession'
import { prepareCampfire } from '../campfire/package'
import { validateMapContract } from '../campfire/generated/index'
import fixture from '../campfire/generated/canonical-fixture.json'
vi.mock('../storage/api',()=>({api:vi.fn()}))
vi.mock('../campfire/package',()=>({prepareCampfire:vi.fn()}))
vi.mock('../projects/localSession',()=>({saveLocalProject:vi.fn()}))
beforeEach(()=>{
 vi.resetAllMocks();Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(){this.setAttribute('open','')}});Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(){this.removeAttribute('open')}})
})
it('saves before publication, sends only contract and bitmap to the service and reports pending review',async()=>{
 const id=useProjectSession.getState().info.id,checked=validateMapContract({...fixture,version:3,mapId:id,windows:[],ceilingRegions:[]});if(!checked.valid)throw Error('Invalid test fixture');const payload=checked.value,receipt={id:'plan',mapId:id,revision:1,status:'READY_FOR_REVIEW',timestamp:'today',key:'safe',fingerprint:'safe'}
 vi.mocked(api).mockImplementation(async(path)=>path==='/campfire/test'?{version:3,constraints:{image:{minDimension:1,dimension:8192,pixels:20000000}}}:path==='/campfire/publish'?receipt:{id:'qa',name:'Campfire',baseUrl:'https://campfire.example',hasToken:true,attention:false,receipts:[]})
 vi.mocked(saveLocalProject).mockImplementation(async()=>{useProjectSession.setState({saveStatus:'saved',error:''})})
 vi.mocked(prepareCampfire).mockResolvedValue({payload,image:new Blob([new Uint8Array([1,2,3])],{type:'image/png'})})
 render(<CampfirePublishingDialog onClose={()=>{}}/>);await waitFor(()=>expect(screen.getByRole('button',{name:'Naar Campfire sturen'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Naar Campfire sturen'}))
 await waitFor(()=>expect(screen.getAllByText(/De kaart is nog niet geïmporteerd/).length).toBeGreaterThan(0));expect(saveLocalProject).toHaveBeenCalledOnce();expect(prepareCampfire).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({id}),3,'C',expect.objectContaining({mapId:id,isCurrent:expect.any(Function)}))
 expect(vi.mocked(api).mock.calls.find(([p])=>p==='/campfire/publish')?.[2]).toEqual({contract:payload,imageBase64:'AQID',replacement:false});expect(useProjectSession.getState().busy).toBe('')
})
it('tests connection without uploading and clears the password input',async()=>{
 vi.mocked(api).mockImplementation(async(path)=>path==='/campfire/test'?{message:'Verbonden',version:3}:path==='/campfire/connection'?{id:'qa',name:'Campfire',baseUrl:'https://campfire.example',hasToken:path==='/campfire/connection',attention:false,receipts:[]}:null)
 render(<CampfirePublishingDialog onClose={()=>{}}/>);await waitFor(()=>expect(screen.getByLabelText('Campfire URL')).toHaveValue('https://campfire.example'))
 fireEvent.change(screen.getByLabelText('Integration token'),{target:{value:'test-secret'}});fireEvent.click(screen.getByRole('button',{name:'Verbinding testen'}));await screen.findByText('Verbonden · contract v3');expect(screen.getByLabelText('Integration token')).toHaveValue('');expect(vi.mocked(api).mock.calls.some(([p])=>p.includes('publish')||p.includes('confirm'))).toBe(false)
})
it('shows pending review explicitly and handles status confirmation without machine-confirm',async()=>{
 const receipt={id:'plan',status:'READY_FOR_REVIEW',mapId:useProjectSession.getState().info.id,revision:1,timestamp:'2026-10-04',key:'safe',fingerprint:'safe'}
 vi.mocked(api).mockImplementation(async(path)=>path.startsWith('/campfire/status/')?{...receipt,status:'CONFIRMED'}:{id:'qa',name:'Campfire',baseUrl:'https://campfire.example',hasToken:true,attention:false,receipts:[receipt]})
 render(<CampfirePublishingDialog onClose={()=>{}}/>);await screen.findByText(/De kaart is nog niet geïmporteerd/);fireEvent.click(screen.getByRole('button',{name:'Status controleren'}));await waitFor(()=>expect(screen.getAllByText(/Geïmporteerd in Campfire/).length).toBeGreaterThan(0));expect(vi.mocked(api).mock.calls.some(([p])=>p.includes('/confirm'))).toBe(false)
})
