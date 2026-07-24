//In this file we are going to build the exact shape of the data that will travel across your monorepo
// 1. Task status
// 2. Task packet
// 3. Agent state
// 4. Agent domain
// 5. Agent entity

export type TaskStatus=
    | 'PENDING_CUSTOMS'  
    | 'QUEUED'           
    | 'IN_PROGRESS'      
    | 'COMPLETED'        
    | 'REJECTED';        

export interface TaskPacket{
    id: string;                  
    intent: string;             
    context?: string;            
    status: TaskStatus;          
    domain: AgentDomain;
    result?: string;             
    rejectionReason?: string;    
    createdAt: number;           
    completedAt?: number;        
}

export type AgentState=
| 'IDLE'        
| 'WORKING'
| 'REPAIRING'
| 'OFFLINE'

export type AgentDomain = 
  | 'ARCHITECT'    
  | 'CODER'        
  | 'REVIEWER'     
  | 'CUSTOMS';     

export interface AgentEntity {
  id: string;
  name: string;
  domain: AgentDomain;
  reputation: number;          
  systemPrompt: string;        
  state: AgentState;
}

export type ExecutionMode = 
  | 'SOLO'          
  | 'MENTORSHIP';  

export interface JobRecord {
  id: string;
  taskId: string;             
  mode: ExecutionMode;
  leadAgentId: string;        
  shadowAgentId?: string;     
  status: 'DISPATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  startedAt: number;
}

