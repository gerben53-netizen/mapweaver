import { detectRooms } from '../domain/rooms'
self.onmessage=event=>{try{self.postMessage({result:detectRooms(event.data)})}catch(error){self.postMessage({error:(error as Error).message})}}
