import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface Comment_Key {
  id: UUIDString;
  __typename?: 'Comment_Key';
}

export interface CreateNewTaskData {
  task_insert: Task_Key;
}

export interface CreateNewTaskVariables {
  projectId: UUIDString;
  title: string;
  status: string;
  description?: string | null;
  priority?: string | null;
  dueDate?: DateString | null;
}

export interface GetMyProfileData {
  user?: {
    id: UUIDString;
    displayName: string;
    email: string;
    createdAt: TimestampString;
  } & User_Key;
}

export interface ListAllProjectsData {
  projects: ({
    id: UUIDString;
    name: string;
    description?: string | null;
    status: string;
    owner: {
      displayName: string;
    };
  } & Project_Key)[];
}

export interface ProjectMembership_Key {
  projectId: UUIDString;
  userId: UUIDString;
  __typename?: 'ProjectMembership_Key';
}

export interface Project_Key {
  id: UUIDString;
  __typename?: 'Project_Key';
}

export interface Task_Key {
  id: UUIDString;
  __typename?: 'Task_Key';
}

export interface UpdateProjectStatusData {
  project_update?: Project_Key | null;
}

export interface UpdateProjectStatusVariables {
  projectId: UUIDString;
  newStatus: string;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface ListAllProjectsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllProjectsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListAllProjectsData, undefined>;
  operationName: string;
}
export const listAllProjectsRef: ListAllProjectsRef;

export function listAllProjects(): QueryPromise<ListAllProjectsData, undefined>;
export function listAllProjects(dc: DataConnect): QueryPromise<ListAllProjectsData, undefined>;

interface GetMyProfileRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyProfileData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetMyProfileData, undefined>;
  operationName: string;
}
export const getMyProfileRef: GetMyProfileRef;

export function getMyProfile(): QueryPromise<GetMyProfileData, undefined>;
export function getMyProfile(dc: DataConnect): QueryPromise<GetMyProfileData, undefined>;

interface CreateNewTaskRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateNewTaskVariables): MutationRef<CreateNewTaskData, CreateNewTaskVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateNewTaskVariables): MutationRef<CreateNewTaskData, CreateNewTaskVariables>;
  operationName: string;
}
export const createNewTaskRef: CreateNewTaskRef;

export function createNewTask(vars: CreateNewTaskVariables): MutationPromise<CreateNewTaskData, CreateNewTaskVariables>;
export function createNewTask(dc: DataConnect, vars: CreateNewTaskVariables): MutationPromise<CreateNewTaskData, CreateNewTaskVariables>;

interface UpdateProjectStatusRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateProjectStatusVariables): MutationRef<UpdateProjectStatusData, UpdateProjectStatusVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateProjectStatusVariables): MutationRef<UpdateProjectStatusData, UpdateProjectStatusVariables>;
  operationName: string;
}
export const updateProjectStatusRef: UpdateProjectStatusRef;

export function updateProjectStatus(vars: UpdateProjectStatusVariables): MutationPromise<UpdateProjectStatusData, UpdateProjectStatusVariables>;
export function updateProjectStatus(dc: DataConnect, vars: UpdateProjectStatusVariables): MutationPromise<UpdateProjectStatusData, UpdateProjectStatusVariables>;

