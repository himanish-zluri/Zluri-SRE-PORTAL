export interface User {
  id: string;
  email: string;
  name: string;
  role: 'DEVELOPER' | 'MANAGER' | 'ADMIN';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface DbInstance {
  id: string;
  name: string;
  type: 'POSTGRES' | 'MONGODB';
}

export interface Pod {
  id: string;
  name: string;
  manager_id: string;
  manager_name: string;
  created_at: string;
}

export interface Query {
  id: string;
  requester_id: string;
  instance_id: string;
  database_name: string;
  submission_type: 'QUERY' | 'SCRIPT';
  query_text: string;
  script_path?: string;
  script_content?: string;
  comments: string;
  pod_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED';
  approved_by?: string;
  rejection_reason?: string;
  execution_result?: any;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  query_request_id: string;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED';
  performed_by: string;
  performed_by_name: string;
  performed_by_email: string;
  details: Record<string, any>;
  created_at: string;
}
