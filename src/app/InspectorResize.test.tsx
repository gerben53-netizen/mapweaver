import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { InspectorResize } from './InspectorResize'
import { useInspectorWidth, clampInspectorWidth } from './inspectorWidth'
import { InspectorSection } from './InspectorSection'
function Panel(){const [width,set]=useInspectorWidth();return <InspectorResize width={width} onChange={set}/>}
it('bounds width, supports keyboard resizing and restores local preference',()=>{
 localStorage.removeItem('mapweaver.inspector-width');expect(clampInspectorWidth(NaN)).toBe(320)
 const v=render(<Panel/>),handle=screen.getByRole('separator',{name:'Resize inspector'})
 expect(handle).toHaveAttribute('aria-valuenow','320');fireEvent.keyDown(handle,{key:'Home'});expect(handle).toHaveAttribute('aria-valuenow','280')
 fireEvent.keyDown(handle,{key:'End'});expect(handle).toHaveAttribute('aria-valuenow','520');fireEvent.keyDown(handle,{key:'ArrowLeft'});expect(handle).toHaveAttribute('aria-valuenow','520')
 fireEvent.keyDown(handle,{key:'ArrowRight',shiftKey:true});expect(handle).toHaveAttribute('aria-valuenow','480');v.unmount();render(<Panel/>);expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow','480');localStorage.removeItem('mapweaver.inspector-width')
})
it('lazily mounts sections and scopes remembered expansion to the object type',()=>{
 const v=render(<InspectorSection type="test-area" title="Geometry"><input aria-label="Geometry value"/></InspectorSection>)
 expect(screen.queryByLabelText('Geometry value')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Geometry'}));expect(screen.getByLabelText('Geometry value')).toBeInTheDocument()
 v.unmount();const b=render(<InspectorSection type="test-area" title="Geometry"><input aria-label="Geometry value"/></InspectorSection>);expect(screen.getByLabelText('Geometry value')).toBeInTheDocument();b.unmount()
 render(<InspectorSection type="test-stamp" title="Geometry"><input aria-label="Geometry value"/></InspectorSection>);expect(screen.queryByLabelText('Geometry value')).toBeNull()
})
