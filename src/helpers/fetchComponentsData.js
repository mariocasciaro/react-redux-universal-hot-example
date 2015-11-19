
function _fetchData(components, getState, dispatch, location, params, deferred) {
  const methodName = deferred ? 'fetchDataDeferred' : 'fetchData';
  return components
    .filter((component) => component && component[methodName]) // only look at ones with a static fetchData()
    .map((component) => component[methodName])    // pull out fetch data methods
    .map(fetchDataFoo =>
      fetchDataFoo(getState, dispatch, location, params));  // call fetch data methods and save promises
}


export function fetchData(components, getState, dispatch, location, params) {
  return Promise.all(_fetchData(components, getState, dispatch, location, params));
}

export function fetchDataDeferred(components, getState, dispatch, location, params) {
  return Promise.all(_fetchData(components, getState, dispatch, location, params, true));
}

export function fetchAllData(components, getState, dispatch, location, params) {
  return fetchData(components, getState, dispatch, location, params)
    .then(() => fetchDataDeferred(components, getState, dispatch, location, params))
    .catch(error => console.error(error, 'Error while fetching data'));
}
