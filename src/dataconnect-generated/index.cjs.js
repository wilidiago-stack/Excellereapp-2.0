const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'studio',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const listAllProjectsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllProjects');
}
listAllProjectsRef.operationName = 'ListAllProjects';
exports.listAllProjectsRef = listAllProjectsRef;

exports.listAllProjects = function listAllProjects(dc) {
  return executeQuery(listAllProjectsRef(dc));
};

const getMyProfileRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyProfile');
}
getMyProfileRef.operationName = 'GetMyProfile';
exports.getMyProfileRef = getMyProfileRef;

exports.getMyProfile = function getMyProfile(dc) {
  return executeQuery(getMyProfileRef(dc));
};

const createNewTaskRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateNewTask', inputVars);
}
createNewTaskRef.operationName = 'CreateNewTask';
exports.createNewTaskRef = createNewTaskRef;

exports.createNewTask = function createNewTask(dcOrVars, vars) {
  return executeMutation(createNewTaskRef(dcOrVars, vars));
};

const updateProjectStatusRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateProjectStatus', inputVars);
}
updateProjectStatusRef.operationName = 'UpdateProjectStatus';
exports.updateProjectStatusRef = updateProjectStatusRef;

exports.updateProjectStatus = function updateProjectStatus(dcOrVars, vars) {
  return executeMutation(updateProjectStatusRef(dcOrVars, vars));
};
