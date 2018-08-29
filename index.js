var chromeLauncher = require('chrome-launcher');
var http = require('http');
const request = require('request-promise');
const WebSocket = require('ws');
var fs = require('fs');
var path = require('path')

var webSocketDebuggerUrl;
var navigateURL = "https://youtube.com";
var screenshotPath = "./screenshots/summa.png";

chromeLauncher.launch().then(chrome => {
	console.log(`Chrome debugging port running on ${chrome.port}`);

	var options = {
		uri: `http://localhost:${chrome.port}/json`,
		method: 'GET',
		json: true
	};

	request(options)
	.then(function (response) {
		console.log(response);
		
		obj = response.find(function(item) {
		    return item.type == "page";
		});

		webSocketDebuggerUrl = obj.webSocketDebuggerUrl;

		console.log(`Init WebSocket Debugger URL is: ${webSocketDebuggerUrl}`);

		ws = new WebSocket(webSocketDebuggerUrl);
		navigateInit = false;
		ws.onopen = function () {
		   console.log('websocket is connected ...');
		   ws.send('{"id":1,"method":"Network.enable","params":{maxPostDataSize: 65536}}', (err) => {
		       if (err) {
		           console.log(err);
		       }else{      
		       		ws.send('{"id":2,"method":"Page.enable","params":{}}', (err) => {
				       if (err) {
				           console.log(err);
				       }else{      
				       		ws.send('{"id":3,"method":"Page.navigate","params":{"url": "'+ navigateURL +'"}}', (err) => {
				               if (err) {
				                   	console.log(err);
				               }
				           });
				       }
				   	});
		       }
		   });
		}

		ws.onmessage = function (ev) {
		   response = JSON.parse(ev.data);
		   console.log(response.method);
		   console.log(response.id);
		   
		   if(response.method == "Page.loadEventFired" && navigateInit){
		   		console.log("captureScreenshotInit");
		   		navigateInit = false;
				ws.send('{"id":4,"method":"Page.captureScreenshot","params":{}}', (err) => {
				   if (err) {console.log(err);}
				});
			}else if(response.id == 4){
		   		const buffer = new Buffer(response.result.data, 'base64');
		   		ensureDirectoryExistence(screenshotPath);
		       	fs.writeFile(screenshotPath, buffer, function(err) {
		           if(err) {return console.log(err);}
		           console.log("The ScreenShot is Captured");
		           ws.close();
		           chrome.kill();
		       	});
		   }else if(response.method == "Page.domContentEventFired"){
				console.log("navigateInit");
		        navigateInit = true;
		   }
		}

	}).catch(function (err) {
		console.log(err);
	});
});

function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

