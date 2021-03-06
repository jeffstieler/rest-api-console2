var querystring = require('querystring'),
    redirect_uri = null,
    client_id = null,
    api_root = null,
    oauth_url = null,
    $ = require('zepto-browserify').$,
    authParams = null;
    

function findToken(cb) {

  try {

    // load from hash if present
    var url = window.location.toString(),
        index = url.indexOf('#access_token');

    if (index > -1) {
      var hash = url.slice(index + 1);

      window.history.replaceState({}, null, window.location.pathname);
      authParams = querystring.parse(hash);
      localStorage.auth = hash;
    } else {
      // check for #error if user bailed on log in
      index = url.indexOf('#error');
      if (index > -1){
        window.history.replaceState({}, null, window.location.pathname);
      }
    }

    // load from localStroage if present
    if (!authParams && localStorage.auth) {
      authParams = querystring.parse(localStorage.auth);
    }

    cb(authParams);

  } catch (error) {
    // no auth params
    delete localStorage.auth;
  }
}

function authHeaders() {

  if (authParams) {
    return { 'Authorization' : 'BEARER ' + authParams.access_token };
  } else {
    return {};
  }

}

function sendRequest(req, callback) {

  // TODO: format the request correctly before sending
  // check the version
  // clean up the path in case it's an absolute URI

  $.ajax({
    type: req.method,
    url: api_root + '/v1' + req.path + (req.query ? "?" + req.query : '' ),
    data: req.method == 'GET' ? null : req.body,
    headers: $.extend({'accept':'application/json'}, authHeaders()),
    success: function(data, status, xhr) {
      callback(null, data, xhr);
    },
    error: function(xhr, errorType, error) {
      var body = xhr.response;

      try {
        body = JSON.parse(body);
      } catch (e) {
        // not valid json
      }
      callback({
        status: xhr.status,
        error: error,
        errorType: errorType,
        body: body,
      }, null, xhr);
    }
  });
}

function OAuth(panel) {

  panel.on('check', function(callback) {
    sendRequest({path: '/me'}, callback);
  });

  panel.on('signin', function(panel) {
    window.location = oauth_url + "?" + panel.$.param({
      'redirect_uri' : redirect_uri,
      'client_id'    : client_id,
      'response_type': 'token'
    });
  });
  
  panel.on('signout', function() {
    delete localStorage.auth;
    panel.setValue(null);
  });

  findToken(function(token) {
    if(token)
      panel.checkAuthentication();
  });
}

OAuth.prototype.request = sendRequest;

function buildAuth(panel) {
  return new OAuth(panel);
}

module.exports = function(config) {
  redirect_uri = config.redirect_uri;
  client_id = config.client_id;
  api_root = config.api_root;
  oauth_url = config.oauth_url;

  return buildAuth;

};