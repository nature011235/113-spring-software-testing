#!/usr/bin/env python3

import angr,sys
import claripy

def main():
    proj = angr.Project('./chal')
    
 
    flag_chars = [claripy.BVS(f'flag_char_{i}', 8) for i in range(8)]
    flag = claripy.Concat(*flag_chars)
    
  
    stdin_stream = angr.SimFileStream('stdin', content=flag, has_end=True)
    
  
    state = proj.factory.entry_state(
        stdin=stdin_stream,
        add_options={angr.options.ZERO_FILL_UNCONSTRAINED_MEMORY, 
                    angr.options.ZERO_FILL_UNCONSTRAINED_REGISTERS}
    )
    
  
    for c in flag_chars:
        state.solver.add(c >= 32)
        state.solver.add(c <= 126)
    
   
    simgr = proj.factory.simulation_manager(state)
    
   
    simgr.explore(find=lambda s: b"Correct!" in s.posix.dumps(1))
    
   
    if simgr.found:
        
        solution_state = simgr.found[0]
        solution = solution_state.solver.eval(flag, cast_to=bytes)
     
        sys.stdout.buffer.write(solution)
    else:
        print("No solution found!")
        secret_key = b""
        sys.stdout.buffer.write(secret_key)


if __name__ == '__main__':
    main()
