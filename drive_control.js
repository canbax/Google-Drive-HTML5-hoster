var CLIENT_ID = 'your_client_id_that_ends_with.apps.googleusercontent.com';
var SCOPES = 'https://www.googleapis.com/auth/drive'
var upload_counter = 0;
var file_count = 0;
var folder_arr = [];
var drive_folders = [];
var files = [];
var tot_folder = 0;
var curr_folder = 0;

//var my_count = 0;

/*Called when the client library is loaded to start the auth flow.
*/
function handleClientLoad() {
    window.setTimeout(checkAuth, 1);
}

/*Check if the current user has authorized the application.
 */
function checkAuth() {
    gapi.auth.authorize(
        { 'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': true },
        handleAuthResult);
}

/*Called when authorization server replies.
 *
 * @param {Object} authResult Authorization result.
 */
function handleAuthResult(authResult) {
    var authButton = document.getElementById('authorizeButton');
    var filePicker = document.getElementById('filePicker');
    var starter = document.getElementById('app_starter');

   
    authButton.style.display = 'none';
    filePicker.style.display = 'none';
    starter.style.display = 'none';

    if (authResult && !authResult.error) {
        // Access token has been successfully retrieved, requests can be sent to the API.
        filePicker.style.display = 'block';
        document.getElementById("status").innerText = "Authorized";
        filePicker.onchange = uploadFile;
    } else {
        document.getElementById("status").innerText = "Authorization failed !";
        // No access token could be retrieved, show the button to start the authorization flow.
        authButton.style.display = 'block';
        authButton.onclick = function () {
            gapi.auth.authorize(
                { 'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': false },
                handleAuthResult);
        };
    }
}

/*Start the file upload.
 *
 * @param {Object} evt Arguments from the file selector.
 */
function uploadFile(evt) {
    gapi.client.load('drive', 'v2', function () {
        file_count = evt.target.files.length;

        for (var i = 0; i < evt.target.files.length; i++) {
            var file = evt.target.files[i];
            
            files.push(file);
            //insertFile(file, null);

            processPath(file.webkitRelativePath);
        }
        
        generateFolder(folder_arr[0].path, null);
        //f1("folder1", [], null);

    });
}

/*Insert new file.
 * @param {File} fileData File object to read data from.
 * @param {Function} callback Function to call when the request is complete.
 */
function insertFile(fileData, folder_id, callback) {
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";
    
    upload_counter++;

    var reader = new FileReader();
    reader.readAsBinaryString(fileData);
    reader.onload = function (e) {
        var contentType = fileData.type || 'application/octet-stream';
        var metadata = {
            'title': fileData.name,
            'mimeType': contentType,
            "parents": [{"kind": "drive#fileLink", "id": folder_id}]
        };

        var base64Data = btoa(reader.result);
        var multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: ' + contentType + '\r\n' +
            'Content-Transfer-Encoding: base64\r\n' +
            '\r\n' +
            base64Data +
            close_delim;

        var request = gapi.client.request({
            'path': '/upload/drive/v2/files',
            'method': 'POST',
            'params': { 'uploadType': 'multipart' },
            'headers': {
                'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
            },
            'body': multipartRequestBody
        });
        if (!callback) {
            callback = function (file) {
                var rate = upload_counter + " / " + file_count;
                document.getElementById("status").innerText = "uploading: " + rate;
                if (upload_counter == file_count) {
                    var starter = document.getElementById('app_starter');
                    starter.setAttribute("href", "https://googledrive.com/host/" + drive_folders[0].id);
                    //starter.innerHTML += "href = \"" + "https://googledrive.com/host/" + drive_folders[0].id + "\"";
                    starter.style.display = "block";
                }
            };
        }
        request.execute(callback);
    }
}

function processPath(path) {

    var arr = path.split("/");
    
    for (var i = 0; i < arr.length - 1; i++) {
        
        var name_arr = [];
        var str_path = "";

        for (var j = 0; j < i; j++) {
            name_arr.push(arr[j]);
            str_path += arr[j] + "/";
        }
        
        str_path += arr[i];
        
        var obj = { name: arr[i], parents: name_arr, path: str_path };

        if (!inArr(obj)) {
            push2FolderArr(obj);
            //folder_arr.push(obj);
        }
    }
    
    tot_folder = folder_arr.length;
}

//ascending order in parents length
function push2FolderArr(obj) {
    var ind = folder_arr.length;
    if (folder_arr.length == 0) {
        folder_arr.push(obj);
    } else {
        for (var i = 0; i < folder_arr.length; i++) {
            if (folder_arr[i].parents.length > obj.parents.length) {
                ind = i;
                break;
            }
        }
        var temp_arr = [];
        for (var i = 0; i < folder_arr.length - ind; i++){
            temp_arr.push(folder_arr.pop());
        }
        folder_arr.push(obj);
        for (var i = 0; i < temp_arr.length; i++) {
            folder_arr.push(temp_arr[i]);
        }
    }
}

function inArr(obj) {
    for (var i = 0; i < folder_arr.length; i++) {
        
        if (folder_arr[i].name == obj.name && folder_arr[i].parents.length == obj.parents.length) {
            for (var j = 0; j < obj.parents.length; j++) {
                if (obj.parents[j] != folder_arr[i].parents[j]) {
                    return false;
                }
            }
            return true;
        }
    }
    return false;
}

function generateFolder(path, callback) {
    
    var arr = path.split("/");
    var title = "";
    if (arr.length > 0) {
        title = arr[arr.length - 1];
    }
    else {
        title = arr[0];
    }

    var parents = getParents(path);

    curr_folder++;

    var request = gapi.client.request({
        'path': '/drive/v2/files',
        'method': 'POST',
        'body': {
            "title": title,
            "mimeType": "application/vnd.google-apps.folder",
            "description": "Some",
            "parents": parents
        }
    });

    if (!callback) {
        callback = function (file) {
            var obj = { id: file.id, path: path };

            drive_folders.push(obj);
            //push2DriverFolders(obj);

            if (curr_folder < tot_folder) {
                document.getElementById("status").innerText = "generated folders: " + curr_folder + " / " + tot_folder;
                generateFolder(folder_arr[curr_folder].path, null);
            } else {
                makePublic();
                pushFiles();
            }
            
        };
    }
        
    request.execute(callback);
}

function makePublic() {

    var id = drive_folders[0].id;

    var permissionBody = {
        'value': '',
        'type': 'anyone',
        'role': 'reader'
    };
    var permissionRequest = gapi.client.drive.permissions.insert({
        'fileId': id,
        'resource': permissionBody
    });
    permissionRequest.execute();
}

function getParents(path) {
    var parents = [];
    
    var arr = path.split("/");
    var str = "";
    for (var i = 0; i < arr.length - 1; i++) {
        str += arr[i];
        if (i < arr.length - 2) {
            str += "/";
        }
    }

    for (var i = 0; i < drive_folders.length; i++) {
        
        if (str == drive_folders[i].path) {
            var obj = { id: drive_folders[i].id };
            parents.push(obj);
            return parents;
        }
    }
    
    return parents;
}

function pushFiles() {
    for (var i = 0; i < files.length; i++) {
        var f_id = getParents(files[i].webkitRelativePath)[0].id;
        insertFile(files[i], f_id, null);
    }
}
