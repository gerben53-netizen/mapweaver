import { beforeEach, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { TerrainAppearanceProperties } from './TerrainAppearanceProperties'
import { WaterAppearanceSettings } from './WaterAppearanceSettings'
import { useProjectStore as store } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { createArea, rectangleGeometry } from '../domain/areas'
import { defaultLandArea } from '../domain/landAreas'
import { defaultMapStyle } from '../domain/mapSettings'
import { defaultGeography } from '../domain/geography'
import { terrainAppearance, waterAppearance } from '../domain/terrainStyles'
import { history, useHistoryStore } from '../store/history'
beforeEach(()=>{
  const o=createArea(rectangleGeometry({x:10,y:10,width:200,height:160}));o.land={...defaultLandArea('landmass'),appearance:terrainAppearance('land')}
  store.setState({map:{width:800,height:600,...defaultMapStyle(),background:null,mapType:'world-map',geography:defaultGeography('world-map'),water:waterAppearance('calm')},objects:[o],layers:[{id:'land',name:'Land',visible:true,locked:false,objectIds:[o.id]}],layerTree:{roots:['land'],groups:[]},objectGroups:[]})
  editor.setState({activeLayerId:'land',selectedObjectIds:[]});history.reset()
})
function terrain() { const o=store.getState().objects[0];if(o.kind!=='area')throw Error('Area required');render(<TerrainAppearanceProperties object={o}/>);fireEvent.click(screen.getByText('Terrain appearance'));return o }
it('provides named presets and rejects invalid terrain drafts without changing the object',()=>{
  const o=terrain();fireEvent.change(screen.getByLabelText('Terrain style'),{target:{value:'snow'}});fireEvent.change(screen.getByLabelText('Coast style'),{target:{value:'contrast'}})
  fireEvent.change(screen.getByLabelText('Terrain texture scale'),{target:{value:'0'}});fireEvent.click(screen.getByText('Apply terrain appearance'));expect(screen.getByRole('alert')).toHaveTextContent('Invalid terrain');expect(store.getState().objects[0]).toBe(o);expect(useHistoryStore.getState().undoCount).toBe(0)
  fireEvent.change(screen.getByLabelText('Terrain texture scale'),{target:{value:'.25'}});fireEvent.click(screen.getByText('Apply terrain appearance'));expect(useHistoryStore.getState().undoCount).toBe(1);const next=store.getState().objects[0];if(next.kind!=='area')throw Error('Area required');expect(next.land?.appearance?.style).toBe('snow');expect(next.geometry).toEqual(o.geometry)
})
it('disables terrain appearance while retaining the original artwork and supports undo',()=>{
  const o=terrain();fireEvent.click(screen.getByText('Use original fill and stroke'));const next=store.getState().objects[0];if(next.kind!=='area')throw Error('Area required');expect(next.land?.appearance).toBeUndefined();expect(next.fill).toEqual(o.fill);history.undo();expect(store.getState().objects[0]).toEqual(o)
})
it('keeps water drafts local, rejects blank scale and commits a valid preset once',()=>{
  const map=store.getState().map;render(<WaterAppearanceSettings map={map}/>);fireEvent.change(screen.getByLabelText('Water style'),{target:{value:'dark'}});expect(store.getState().map).toBe(map)
  fireEvent.change(screen.getByLabelText('Water texture scale'),{target:{value:''}});fireEvent.click(screen.getByText('Apply water appearance'));expect(screen.getByRole('alert')).toHaveTextContent('Invalid water');expect(store.getState().map).toBe(map)
  fireEvent.change(screen.getByLabelText('Water texture scale'),{target:{value:'.5'}});fireEvent.click(screen.getByText('Apply water appearance'));expect(store.getState().map.water?.style).toBe('dark');expect(useHistoryStore.getState().undoCount).toBe(1)
  fireEvent.click(screen.getByText('Use plain map color'));expect(store.getState().map.water).toBeUndefined();expect(store.getState().map.backgroundColor).toBe(map.backgroundColor)
})
