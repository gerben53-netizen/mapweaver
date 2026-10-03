import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { OperationFeedback } from './OperationFeedback'
import type { Feedback } from './OperationFeedback'
function Harness({kind}:{kind:Feedback['kind']}){const [value,setValue]=useState<Feedback|null>({kind,message:'Action result'});return <OperationFeedback value={value} onDismiss={()=>setValue(null)}/>}
afterEach(()=>vi.useRealTimers())
it('automatically removes success feedback after five seconds',()=>{
 vi.useFakeTimers();render(<Harness kind="success"/>);expect(screen.getByRole('status')).toHaveTextContent('Action result')
 act(()=>vi.advanceTimersByTime(5000));expect(screen.queryByRole('status')).toBeNull()
})
it.each(['warning','error'] as const)('retains %s feedback until dismissed',kind=>{
 vi.useFakeTimers();render(<Harness kind={kind}/>);act(()=>vi.advanceTimersByTime(30000));expect(screen.getByRole('alert')).toBeInTheDocument()
 fireEvent.click(screen.getByRole('button',{name:'Dismiss feedback'}));expect(screen.queryByRole('alert')).toBeNull()
})
