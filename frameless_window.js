// Start :
//   /Applications/nwjs.app/Contents/MacOS/nwjs  --remote-debugging-port=9222  .
//
// Debug with chrome:
//   http://127.0.0.1:9222/
//
//   Stop timer in console :  isPaused = true
//
// Secret : if onClick doesn't work on html-element, add this to CSS :  -webkit-app-region: no-drag;
//
// Package : https://github.com/nwjs/nw.js/wiki/How-to-package-and-distribute-your-apps

/*
 TODO : Open questions
 - Make settings dialog
 
 - Dropped folder, if not repository, dialog to ask if allowed to initialize

 - How to checkout ? (Maybe let Store button become Chechout when browsing history ?)
 - How to handle change in checkout which is not HEAD (detached head)?  Auto-create branch ? Dialog to ask if create new branch or move to top ?

 - See list of files clicking on Modified / New / Deleted
 
 - See if I can use simple-git.js Promise version (see : https://medium.com/@erbalvindersingh/pushing-a-git-repo-online-to-github-via-nodejs-and-simplegit-package-17893ecebddd )
 - How to setup remote repository ?  (see : https://medium.com/@erbalvindersingh/pushing-a-git-repo-online-to-github-via-nodejs-and-simplegit-package-17893ecebddd , or try my version by implementing raw REST calls)

 - How to pull ? Auto-pull before push ?
 - How to merge ?

 - How to initialize git-flow ?

 - How to checkout ? (Maybe let Store button become Chechout when browsing history ?)
 - How to handle change in checkout which is not HEAD (detached head)?  Auto-create branch ? Dialog to ask if create new branch or move to top ?

 Docs : https://www.npmjs.com/package/simple-git
        https://github.com/steveukx/git-js#readme  (nicely formmatted API)
*/


// ---------
// INIT
// ---------

    global.globalString = "This can be accessed anywhere!";

    const WAIT_TIME = 5000; // Time to wait for brief messages being shown (for instance in message field)

    var gui = require("nw.gui");    
    var os = require('os');
    var fs = require('fs');
    const simpleGit = require('simple-git');  // npm install simple-git
 
    const pathsep = require('path').sep;  // Os-dependent path separator
    const tmpdir = os.tmpdir();
      
    // Files & folders
    var settingsDir = os.homedir() + pathsep + '.Pragma-git'; mkdir( settingsDir);
    var settingsFile = settingsDir + pathsep + 'repo.json';    
       
    // json settings
    var jsonData = loadSettings(settingsFile);


    // Collect settings
    var repoSettings = {}; 
    repoSettings.localFolder = '/Users/jan/Desktop/TEMP/Test-git';
    
  
    // Timer
    gitStatus();
    //var timer = setInterval(() => gitStatus(), 2000);
    
    var isPaused = false;
    
    var timer = window.setInterval(function() {
        if(!isPaused) {
            gitStatus();
        }
    }, 2000);

    // PositionalPointers
    var repoNumber = 0;
    var branchNumber = 0;
    var historyNumber = -1;
    
    var branchName;
    
    var historyBeingBrowsed = false;
    
    
    updateContentStyle();


// ---------
// FUNCTIONS
// ---------

async function unComittedFiles(){
    var status_data;  
    try{
        await simpleGit(repoSettings.localFolder).status((err, result) => {console.log(result); console.log(err);status_data = result})
    }catch(err){
        console.log('Error in unComittedFiles,  calling  gitStatus()');
        console.log(err);
    }
 
    // If no files to commit
    var uncommitedFiles = false;
    if ( (status_data.modified.length + status_data.not_added.length + status_data.deleted.length) > 0){
        uncommitedFiles = true;
    }  
    return uncommitedFiles;
}

// Git commands
async function gitStatus(){
    // Read git status
    var status_data;  
    try{
        // Understand this: 
        // - simpleGit(dir).status( handler_function)
        // - handler_function is defined as an anonymous function with arrow ('=>') notation
        // - the two outputs from status are input variables to the anonymous function.
        await simpleGit(repoSettings.localFolder).status((err, result) => {console.log(result); console.log(err);status_data = result})
    }catch(err){
        console.log('Error in gitStatus()');
        console.log(err);
    }
 
    // Update message text placeholder
    if (!historyBeingBrowsed){
        if ( (status_data.modified.length + status_data.not_added.length + status_data.deleted.length) == 0){
            setStoreButtonEnableStatus( false );
            writeMessage( 'No changed files to store', true); // Write to placeholder
        }else {
            // Tell the user to add a description
            var message = readMessage();
            if (message.length == 0){
                writeMessage( 'Add description...', true);
            }
        }
        
    }

    
    // Status
    setStatusBar( 'Modified = ' + status_data.modified.length + ' |  New = ' + status_data.not_added.length + ' |  Deleted = ' + status_data.deleted.length);
   
    // Get name of current branch
    var currentBranch = status_data.current;

    // Get name of local folder  
    var currentDir = simpleGit(repoSettings.localFolder)._executor.cwd;    
    var foldername = currentDir.replace(/^.*[\\\/]/, '');
    
    // KEEP HERE: May be useful in future 
    //
    // 1) Get name of Repo
    //var rawOut; 
    //await simpleGit.raw([ 'config', '--get', 'remote.origin.url'], (err, result) => {console.log(result); rawOut = result})
    //var repoName = rawOut.replace(/^.*[\\\/]/, '');
    
    // 2) Get list of all settings in local 
    //var listOut; 
    //await simpleGit.raw([ 'config', '--list'], (err, result) => {console.log(result); listOut = result})

    

  
    setTitleBar( 'top-titlebar-repo-text', foldername   );
    setTitleBar( 'top-titlebar-branch-text', '  (<u>' + currentBranch + '</u>)' );
}
async function gitAddCommitAndPush( message){
    var status_data;     
    
    // Read current branch
    try{
        await simpleGit(repoSettings.localFolder).status((err, result) => {console.log(result); console.log(err);status_data = result})
    }catch(err){
        console.log('Error in gitStatus()');
        console.log(err);
    }
    var currentBranch = status_data.current;
    var remoteBranch = currentBranch; // Assume that always same branch name locally and remotely
    
    // Add all files
    setStatusBar( 'Adding files');
    var path = '.'; // Add all
    await simpleGit(repoSettings.localFolder).add( path, (err, result) => {console.log(result) });
    await waitTime( 1000);
    
    // Commit including deleted
    setStatusBar( 'Commiting files  (to ' + currentBranch + ')');
    await simpleGit(repoSettings.localFolder).commit( message, {'--all' : null} , (err, result) => {console.log(result) });
    await waitTime( 1000);
    
    // Push (and create remote branch if not existing)
    setStatusBar( 'Pushing files  (to remote ' + remoteBranch + ')');
    await simpleGit(repoSettings.localFolder).push( remoteBranch, {'--set-upstream' : null}, (err, result) => {console.log(result) }); 
    await waitTime( 1000);  
        
    writeMessage('',false);  // Remove this message  
    gitStatus();
}
async function gitInitRepo( folder){
    var status_data;     
    
    // Read current branch
    try{
        setStatusBar( 'Initializing repository ');
        await simpleGit(folder).init((err, result) => {console.log(result); console.log(err);status_data = result})
        await waitTime( 1000);
        gitAddCommitAndPush( 'First commit')
    }catch(err){
        console.log('Error in gitInitRepo()');
        console.log(err);
    }

    // Remove this message  
    writeMessage('',false);  
    gitStatus();
}
async function unComittedFiles(){
    var status_data;  
    try{
        await simpleGit(repoSettings.localFolder).status((err, result) => {console.log(result); console.log(err);status_data = result})
    }catch(err){
        console.log('Error in unComittedFiles,  calling  gitStatus()');
        console.log(err);
    }
 
    // If no files to commit
    var uncommitedFiles = false;
    if ( (status_data.modified.length + status_data.not_added.length + status_data.deleted.length) == 0){
        uncommitedFiles = true;
    }  
    return uncommitedFiles;
}

function waitTime( delay) {
// Delay in milliseconds
  console.log("starting delay ")
  return new Promise(resolve => {
    setTimeout(function() {
      resolve("delay ")
      console.log("delay is done")
    }, delay)
  })
}

// OS commands
function mkdir(dir){
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
}

// Utility functions
function updateStatusBar( text){
    newmessage = document.getElementById('bottom-titlebar-text').innerHTML + text;
    document.getElementById('bottom-titlebar-text').innerHTML = newmessage;
    console.log('updateStatusBar = ' + newmessage);
}
function setStatusBar( text){
    document.getElementById('bottom-titlebar-text').innerHTML = text;
    console.log('setStatusBar = ' + text);
}
function setTitleBar( id, text){
    document.getElementById(id).innerHTML = text;
    console.log('setTitleBar (element ' + id + ') = ' + text);
}

function setStoreButtonEnableStatusFromText() {
    // Enable if message text 
    var message = readMessage();
    setStoreButtonEnableStatus( (message.length > 0 ));
}
function setStoreButtonEnableStatus( enableStatus) {
    document.getElementById('store-button').disabled = !enableStatus;
}

// Message
function readMessage( ){
    return document.getElementById('message').value;
}
function writeMessage( message, placeholder){
    if (placeholder){
        document.getElementById('message').value = "";
        document.getElementById('message').placeholder = message;
    }else{
        document.getElementById('message').value = message;
    }
}
async function  writeTimedMessage( message, placeholder, time){
    // Give the user the time to read the message, then restore previous message
    
    // Pause timer
    isPaused = true;
    
    // Store old message
    var oldMessage = document.getElementById('message').value;
    if (placeholder){
        oldMessage = document.getElementById('message').placeholder;
    }
    
    // Show new message and wait
    writeMessage( message, placeholder);
    await waitTime( time).catch({});
    
    // Restore old message (if user hasn't written something in the wait time
    if ( document.getElementById('message').length == 0 ){
        writeMessage( oldMessage, placeholder);
    }
    
    // Restart timer
    isPaused = false;  
} 


// Settings
function saveSettings(){
    
    // Update current window position
        win = gui.Window.get();
        jsonData.position.x = win.x;
        jsonData.position.y = win.y;
        jsonData.position.width = win.width;
        jsonData.position.height = win.height;  
    
    // Save settings
    var jsonString = JSON.stringify(jsonData, null, 2);
    fs.writeFileSync(settingsFile, jsonString);
}
function loadSettings(settingsFile){
    try{
        jsonString = fs.readFileSync(settingsFile);
        jsonData = JSON.parse(jsonString);
    }catch(err){
        // Defaults
        jsonData = {};
        jsonData.localFolder = '/Users/jan/Desktop/TEMP/Test-git';
        jsonData.homedir = os.homedir();
        
        jsonData.repos = [];

    }
    
    // Move window
    try{
        // Validate position on screen
        if ( (jsonData.position.x + jsonData.position.width) > screen.width ) {
            jsonData.position.x = screen.availLeft;
        }
        
        if ( (jsonData.position.y + jsonData.position.height) > screen.height ){
            jsonData.position.y = screen.availTop;
        }
        
        // Position and size window
        win = gui.Window.get();
        win.moveTo( jsonData.position.x, jsonData.position.y);
        win.resizeTo( jsonData.position.width, jsonData.position.height);

        
    }catch(err){
        console.log('Error setting window position and size');
        console.log(err);
    }
    return jsonData;
}

// ---------
// CALLBACKS
// ---------

// Title bar
function closeWindow() {
    // Store window position
    jsonData["position"] = {}; // New level
    jsonData["position"]["x"] = gui.Window.get().x;
    jsonData["position"]["y"] = gui.Window.get().y;
    jsonData["position"]["height"] = gui.Window.get().height;
    jsonData["position"]["width"] = gui.Window.get().width;
    
    saveSettings();
    gui.App.closeAllWindows();
}

function updateImageUrl(image_id, new_image_url) {
  var image = document.getElementById(image_id);
  if (image)
    image.src = new_image_url;
}
function focusTitlebars(focus) {
  var bg_color = focus ? "#3a3d3d" : "#7a7c7c";
    
  var titlebar = document.getElementById("top-titlebar");
  if (titlebar)
    titlebar.style.backgroundColor = bg_color;
  titlebar = document.getElementById("bottom-titlebar");
  if (titlebar)
    titlebar.style.backgroundColor = bg_color;
  titlebar = document.getElementById("left-titlebar");
  if (titlebar)
    titlebar.style.backgroundColor = bg_color;
  titlebar = document.getElementById("right-titlebar");
  if (titlebar)
    titlebar.style.backgroundColor = bg_color;
}
function updateContentStyle() {
    
    // This is to make statusbar and titlebar position well
    var content = document.getElementById("content");
    if (!content)
    return;
    
    var left = 0;
    var top = 0;
    var width = window.outerWidth; 
    var height = window.outerHeight;
    
    var titlebar = document.getElementById("top-titlebar");
    if (titlebar) {
        height -= titlebar.offsetHeight + 36 + 2;
        top += titlebar.offsetHeight;
    }
    titlebar = document.getElementById("bottom-titlebar");
    
    // Adjust content width by border
    width -=   6 ; // Width in content border
    
    var contentStyle = "position: absolute; ";
    contentStyle += "left: " + left + "px; ";
    contentStyle += "top: " + top + "px; ";
    contentStyle += "width: " + width + "px; ";
    contentStyle += "height: " + height  + "px; ";
    content.setAttribute("style", contentStyle);
    
    // This is to make message textarea follow window resize
    var message_area = document.getElementById("message");
    var message_area_style = "height: " + (height - 28).toString() + "px; ";
    message_area_style += "width: 100%; " ;
    message_area_style += "resize: none; " ;
    message_area.setAttribute("style", message_area_style);

  
}

function repoClicked(){
    // Cycle through stored repos
    repoNumber = repoNumber + 1;
    var numberOfRepos = jsonData.repos.length;
    if (repoNumber >= numberOfRepos){
        repoNumber = 0;
    }
    repoSettings.localFolder = jsonData.repos[repoNumber].localFolder;
    gitStatus();
        
    // Reset some variables
    historyNumber = -1;
    historyBeingBrowsed = false;
}
async function branchClicked(){
    
    // Determine status of local repository
    var status_data;  
    try{
        await simpleGit(repoSettings.localFolder).status((err, result) => {console.log(result); console.log(err);status_data = result})
    }catch(err){
        console.log('Error in unComittedFiles,  calling  gitStatus()');
        console.log(err);
    }
 
    // Determine if no files to commit
    var uncommitedFiles = false;
    if ( (status_data.modified.length + status_data.not_added.length + status_data.deleted.length) > 0){
        uncommitedFiles = true;
    }  


    // Checkout branch  /  Warn about uncommited
    if ( uncommitedFiles ){
        // Let user know that they need to commit before changing branch
        await writeTimedMessage( 'Before changing branch :' + os.EOL + 'Add description and store ...', true, WAIT_TIME)
        
    }else{
            
        // Determine local branches
        var branchList;
        try{
            isPaused = true;
            await simpleGit(repoSettings.localFolder).branch(['--list'], (err, result) => {console.log(result); branchList = result.all});
        }catch(err){        
            console.log('Error determining local branches, in branchClicked()');
            console.log(err);
        }
        
        // Cycle through local branches
        branchNumber = branchNumber + 1;
        var numberOfBranches = jsonData.repos.length;
        if (branchNumber >= numberOfBranches){
            branchNumber = 0;
        }
        branchName = branchList[branchNumber];

    
        // Checkout local branch
        try{
            await simpleGit(repoSettings.localFolder).checkout(branchName, (err, result) => {console.log(result)} );
        }catch(err){        
            console.log('Error checking out local branch, in branchClicked(). Trying to checkout of branch = ' + branchName);
            console.log(err);
        }   
    }

    console.log(branchList);
 
    gitStatus();
    
    // Reset some variables
    historyNumber = -1;
    historyBeingBrowsed = false;
}

async function downArrowClicked(){
    console.log('down arrow clicked');
    
    // Get log
    var history;
    try{
        await simpleGit(repoSettings.localFolder).log( (err, result) => {console.log(result); history = result.all;} );
    }catch(err){        
        console.log(err);
    }   

    // Cycle through history
    var numberOfHistorySteps = history.length;
    historyNumber = historyNumber + 1;
    
    var numberOfBranches = jsonData.repos.length;
    if (historyNumber >= numberOfHistorySteps){
        historyNumber = 0;
    }
    
    // Reformat date ( 2020-07-01T09:15:21+02:00  )  =>  09:15 (2020-07-01)
    var historyString = ( history[historyNumber].date).substring( 11,11+8) 
    + ' (' + ( history[historyNumber].date).substring( 0,10) + ')'
    + os.EOL 
    + history[historyNumber].message;
    
    // Display
    writeMessage( historyString, true);
    historyBeingBrowsed = true; // Mark history being browsed, to stop timer update of message
    
}
async function upArrowClicked(){
    console.log('up arrow clicked');
    
    // Get log
    var history;
    try{
        await simpleGit(repoSettings.localFolder).log( (err, result) => {console.log(result); history = result.all;} );
    }catch(err){        
        console.log(err);
    }   

    // Cycle through history
    var numberOfHistorySteps = history.length;
    historyNumber = historyNumber - 1;
    
    var numberOfBranches = jsonData.repos.length;
    if (historyNumber < 0){
        // Leave history browsing
        historyNumber = -1;
        historyBeingBrowsed = false;
        gitStatus();
    }else{
        // Show history
        
        // Reformat date ( 2020-07-01T09:15:21+02:00  )  =>  09:15 (2020-07-01)
        var historyString = ( history[historyNumber].date).substring( 11,11+8) 
        + ' (' + ( history[historyNumber].date).substring( 0,10) + ')'
        + os.EOL 
        + history[historyNumber].message;
        
        // Display
        writeMessage( historyString, true);
        historyBeingBrowsed = true; // Mark history being browsed, to stop timer update of message
        }
}

// Content
async function dropFile(e) {
    e.preventDefault();
    
    // Reset css 
    document.getElementById('content').className = '';
    
    const item = e.dataTransfer.items[0];
    const entry = item.webkitGetAsEntry();
    
    var file = item.getAsFile().path;
    var folder = file; // Guess that a folder was dropped 

    if (entry.isFile) {
        folder = require('path').dirname(file); // Correct, because file was dropped
        console.log( 'Folder = ' + folder );
    } 
    
    
    // Check if repository -- ask to initialize if needed
    // TODO: Fix text in about.html

    
    // Find folder in local repo
    var topFolder;
    try{
        await simpleGit(folder).raw([ 'rev-parse', '--show-toplevel'], (err, result) => {console.log(result); topFolder = result});
        topFolder = topFolder.replace(os.EOL, ''); // Remove ending EOL
    }catch(error){
        
        // Assume problem is that folder was not a repository
        
        // Create new repository
        
        var nameOfFolder = folder.replace(/^.*[\\\/]/, '');
        var string = 'This folder is not a repository.'+ os.EOL;
        string += 'Do you want to initialize this folder as a git repository ?' + os.EOL;
        string += 'The name of the repository will be "' + nameOfFolder + '" ';
        
        if ( confirmationDialog(string) ) {
            gitInitRepo( folder);
        }
        
        // Find folder
        try{
            await simpleGit(folder).raw([ 'rev-parse', '--show-toplevel'], (err, result) => {console.log(result); topFolder = result});
            topFolder = topFolder.replace(os.EOL, ''); // Remove ending EOL
        }catch(error){

        }
    }
    
    // Add folder to jsonData
    var index = jsonData.repos.length;
    jsonData.repos[index] = {}; 
    jsonData.repos[index].localFolder = topFolder;
    
    // Set to current
    branchNumber = index;
    branchName = topFolder;

    // Set global
    repoSettings.localFolder = topFolder;
    console.log( 'Git  folder = ' + repoSettings.localFolder );
    
    // Update immediately
    gitStatus();
};
function storeButtonClicked() { 
    gitAddCommitAndPush( readMessage());
}  


// Status bar
function showAbout() {    
    console.log('About button pressed');
    
    about_win = gui.Window.open('about.html#/new_page', {
        position: 'center',
        width: 600,
        height: 450,
        
    });
    
    // gui.Window.get().y  // Gets position of my gui window
}
function confirmationDialog(text) {    
    console.log('confirmationDialog called');
    
    //var dialog_win = gui.Window.open('confirmationDialog.html#/new_page', {
        //position: 'center',
        //width: 300,
        //height: 100,
        //focus: true
    //});

    console.log('Opened Confirmation Dialog');
    
    return confirm(text);
}


async function settingsDialog() {    
    console.log('settings dialog pressed');
    
    // TODO : Here settings can be done.  For instance remote git linking
    
    var output;
    try{
        await simpleGit(repoSettings.localFolder).log( (err, result) => {console.log(result); output = result;} );
    }catch(err){        
        console.log(err);
    }   
    
    var history = output.ListLogSummary.all;

    
}
function folderClicked(){
    console.log('Folder clicked');
    gui.Shell.showItemInFolder(repoSettings.localFolder);
}

// ------
// EVENTS
// ------
window.onfocus = function() { 
  console.log("focus");
  focusTitlebars(true);
};
window.onblur = function() { 
  console.log("blur");
  focusTitlebars(false);
};
window.onresize = function() {
  updateContentStyle();
};
window.onload = function() {
  var win = nw.Window.get();
 
  
  // Fix for overshoot of content outside window
  updateContentStyle(); 
  if (document.getElementById('content').offsetWidth > window.innerWidth){
    win.reload();
  }
  win.show(); 
  
  focusTitlebars(true);
  win.setAlwaysOnTop(true);

};
