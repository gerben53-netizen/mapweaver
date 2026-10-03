import { expect,it } from 'vitest'
import { fireEvent,render,screen } from '@testing-library/react'
import { GeographyFinishSettings } from './GeographyFinishSettings'
import { useProjectStore } from '../store/projectStore'
import { history } from '../store/history'
it('keeps drafts local until Apply, reports invalid values, and commits controls',()=>{
 history.reset();const map=useProjectStore.getState().map
 render(<GeographyFinishSettings map={map}/>);fireEvent.click(screen.getByText('Geography & terrain finish'))
 fireEvent.change(screen.getByLabelText('Relief strength'),{target:{value:'0.7'}});expect(useProjectStore.getState().map).toBe(map)
 fireEvent.click(screen.getByText('Apply geography finish'));expect(useProjectStore.getState().map.geographyFinish?.relief.strength).toBe(.7)
 fireEvent.change(screen.getByLabelText('Light direction (degrees clockwise from north)'),{target:{value:'900'}});fireEvent.click(screen.getByText('Apply geography finish'));expect(screen.getByRole('alert')).toHaveTextContent('outside supported range')
 history.undo();expect(useProjectStore.getState().map).toBe(map)
})
