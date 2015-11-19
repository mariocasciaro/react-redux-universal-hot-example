/**
 * THIS IS THE ENTRY POINT FOR THE CLIENT, JUST LIKE server.js IS THE ENTRY POINT FOR THE SERVER.
 */
import 'babel/polyfill';
import React from 'react';
import ReactDOM from 'react-dom';
import createHistory from 'history/lib/createBrowserHistory';
import createStore from './redux/create';
import ApiClient from './helpers/ApiClient';
import io from 'socket.io-client';
import {Provider} from 'react-redux';
import {Router, match, createRoutes} from 'react-router';
import {syncReduxAndRouter} from 'redux-simple-router';
import getRoutes from './routes';
import {fetchData, fetchDataDeferred} from './helpers/fetchComponentsData';
import useScroll from 'scroll-behavior/lib/useStandardScroll';

const client = new ApiClient();

const dest = document.getElementById('content');
const store = createStore(client, window.__data);
const routes = getRoutes(store);

function initSocket() {
  const socket = io('', {path: '/api/ws', transports: ['polling']});
  socket.on('news', (data) => {
    console.log(data);
    socket.emit('my other event', { my: 'data from client' });
  });
  socket.on('msg', (data) => {
    console.log(data);
  });

  return socket;
}

global.socket = initSocket();

const history = useScroll(createHistory)({routes: createRoutes(routes)});
syncReduxAndRouter(history, store);

let lastMatchedLocBefore;
let lastMatchedLocAfter;

history.listenBefore((location, callback) => {
  const loc = location.pathname + location.search + location.hash;
  if (lastMatchedLocBefore === loc) {
    return callback();
  }

  match({routes: routes, location: loc}, (err, redirectLocation, nextState) => {
    if (!err && nextState) {
      fetchData(nextState.components, store.getState, store.dispatch,
        location, nextState.params)
        .then(() => {
          lastMatchedLocBefore = loc;
          callback();
        })
        .catch(err2 => {
          console.error(err2, 'Error while fetching data');
          callback();
        });
    } else {
      console.log('Location "%s" did not match any routes (listenBefore)', loc);
      callback();
    }
  });
});

history.listen((location) => {
  const loc = location.pathname + location.search + location.hash;
  if (lastMatchedLocAfter === loc) {
    return;
  }

  match({routes: routes, location: loc}, (err, redirectLocation, nextState) => {
    if (err) {
      console.error(err, 'Error while matching route (change handler)');
    } else if (nextState) {
      fetchDataDeferred(nextState.components, store.getState,
        store.dispatch, location, nextState.params)
        .then(() => lastMatchedLocAfter = loc)
        .catch((err2) => console.error(err2, 'Error while fetching deferred data'));
    } else {
      console.log('Location "%s" did not match any routes (listen)', loc);
    }
  });
});

const component = (
  <Router history={history}>
    {routes}
  </Router>
);

ReactDOM.render(
  <Provider store={store} key="provider">
    {component}
  </Provider>,
  dest
);

if (process.env.NODE_ENV !== 'production') {
  window.React = React; // enable debugger

  if (!dest || !dest.firstChild || !dest.firstChild.attributes || !dest.firstChild.attributes['data-react-checksum']) {
    console.error('Server-side React render was discarded. Make sure that your initial render does not contain any client-side code.');
  }
}

if (__DEVTOOLS__) {
  const DevTools = require('./containers/DevTools/DevTools');
  ReactDOM.render(
    <Provider store={store} key="provider">
      <div>
        {component}
        <DevTools />
      </div>
    </Provider>,
    dest
  );
}
