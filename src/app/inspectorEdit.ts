import { useEditorStore } from '../store/editorStore'
export function inspectorEdit(action:()=>void){try{action();useEditorStore.setState({message:''})}catch(e){useEditorStore.setState({message:(e as Error).message})}}
