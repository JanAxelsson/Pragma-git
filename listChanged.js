
// Define DEBUG features
var devTools = false;
var isPaused = false; // Stop timer. In console, type :  isPaused = true

// ---------
// INIT
// ---------
var gui = require("nw.gui"); // TODO : don't know if this will be needed
var os = require('os');
var fs = require('fs');
        
const pathsep = require('path').sep;  // Os-dependent path separator
        
const simpleGit = require('simple-git');  



var state = global.state; // internal copy of global.state
var localState = global.localState; 

var win

const delayInMs = 1000;

// Initiate GUI update loop 
//var timer = _loopTimer( 1000);

// Storage of paths to backup files
//const backupExtension = '.orig';
var origFiles = [];  // Store files found to be conflicting.  Use to remove .orig files of these at the end

// ---------
// FUNCTIONS
// ---------    

// Start initiated from settings.html
async function injectIntoJs(document) {

    
    console.log('listChanged.js entered');
    win = gui.Window.get();
    
    // For systems that have multiple workspaces (virtual screens)
    if ( win.canSetVisibleOnAllWorkspaces() ){
        win.setVisibleOnAllWorkspaces( state.onAllWorkspaces ); 
    }
        
    // Always on top
    win.setAlwaysOnTop( state.alwaysOnTop );
    
    let status_data;
    
    // Git Status
    try{
        await simpleGit( state.repos[state.repoNumber].localFolder).status( onStatus );
        function onStatus(err, result ){ status_data = result; console.log(result); console.log(err) };
    }catch(err){
        console.log("createFileTable -- Error getting git status" );
        return
    }
    
    // if localState.mode='HISTORY', override
    if (localState.mode == 'HISTORY'){
        status_data = localState.history_status_data;  // Set by main app.js
    }
    
          
    if (devTools == true){
        win.showDevTools();  // WARNING : causes redraw issues on startup
    }

    // Draw table
    origFiles = createFileTable(status_data);
    document.getElementById('listFiles').click();  // Open collapsed section 
    
    
    // Change text that does not match History mode 
    if (localState.mode == 'HISTORY'){
        document.getElementById('instructionsHEAD').style.display = 'none'; // Only show instructions for history
        document.getElementById('listFiles').innerText = 'Files changed since previous revision :';  // Correct title to match historical file changes
    }else{
        document.getElementById('instructionsHistory').style.display = 'none'; // Only show instructions for HEAD file-list
    }
    
    // Set table header according to mode

};

// Main functions 
async function _callback( name, event, event2){

    let id = event.id;
    let file;
    let commit;
    let status_data;
    let tool;
    
    console.log('_callback = ' + name);
    switch(name) {
       
        case 'applySelectedFilesButton': {
            console.log('applySelectedFilesButton');
            console.log(event);
            
            localState.unstaged = makeListOfUnstagedFiles();

            // Note : This will be done once again after pressing Store (in case something has happened)
               
            // Add all files to index (all newest versions of working-tree files will be in index)
            var path = '.'; // Add all
            await simpleGit( state.repos[state.repoNumber].localFolder )
                .add( path, onAdd );   
            function onAdd(err, result) {console.log(result) ;console.log(err); }
            
            // Remove localState.unstaged from index
            for (let file of localState.unstaged) {
                 await simpleGit( state.repos[state.repoNumber].localFolder )
                .raw( [  'reset', '--', file ] , onReset); 
            }
            function onReset(err, result) {console.log(result) ;console.log(err);}

            closeWindow();
            break;
        }
         
        case 'diffLinkAll' : {
            console.log('diffLinkAll');
            console.log(event);
            
            tool = state.tools.difftool;

            
            // Prepare command  --  Can be either history mode, or normal mode
            if (localState.mode == 'HISTORY') {
                // History
                console.log('diffLinkAll -- history');
                
                commit = event;

                tool = state.tools.difftool;
    
                // Prepare for git diff with previous commit and selected commit in history log
                command = [  
                    'difftool',  
                    '--tool',
                    tool,
                    '--dir-diff',
                    commit + "^" ,
                    commit
                ];  
                    
                
            } else {
                // Not history
                console.log('diffLinkAll -- normal');
                
                // Prepare for git diff HEAD (which compares staged/unstaged workdir file to HEAD)
                command = [  
                    'difftool',
                    '--tool',
                    tool,
                    '--dir-diff',
                    'HEAD'
                ];
            }
       
            // Git 
            status_data;
            try{
                simpleGit( state.repos[state.repoNumber].localFolder)
                    .raw(command, onStatus );
                    function onStatus(err, result){ console.log(result); console.log(err); status_data = result; };
            }catch(err){
                console.log('diffLink -- caught error ');
                console.log(err);
            }
            
            
            
            
            break;
        }

        case 'diffLinkHistory': {
         
            // Three inputs
            console.log('diffLinkHistory');
            console.log(event);
            
            commit = event;
            file = event2;
            
            //file = file.replace('/','//');
            
            tool = state.tools.difftool;

            // Prepare for git diff with previous commit and selected commit in history log
            command = [  
                'difftool',
                '-y',  
                '--tool',
                tool,
                commit + "^:" + file,
                commit + ":" + file
            ];

            // Git 
            status_data;
            try{
                simpleGit( state.repos[state.repoNumber].localFolder)
                    .raw(command, onStatus );
                    function onStatus(err, result){ console.log(result); console.log(err); status_data = result; };
            }catch(err){
                console.log('diffLinkHistory -- caught error ');
                console.log(err);
            }
        

            break;
        }
 
        case 'diffLink': {
            console.log('diffLink');
            console.log(event);
            
            file = event;
            file = file.replace('/','//');
            
            tool = state.tools.difftool;

            // Prepare for git diff HEAD (which compares staged/unstaged workdir file to HEAD)
            command = [  
                'difftool',
                '-y',  
                '--tool',
                tool,
                'HEAD',
                '--',
                file
            ];

            // Git 
            status_data;
            try{
                simpleGit( state.repos[state.repoNumber].localFolder)
                    .raw(command, onStatus );
                    function onStatus(err, result){ console.log(result); console.log(err); status_data = result; };
            }catch(err){
                console.log('diffLink -- caught error ');
                console.log(err);
            }
        

            break;
        }
 
        case 'discardLink': {
            console.log('discardLink');
            console.log(event);
            
            file = event;   
            try{
                
                // Unstage (may not be needed, but no harm)
                 await simpleGit( state.repos[state.repoNumber].localFolder )
                    .raw( [  'reset', '--', file ] , onReset); 
                    function onReset(err, result) {console.log(result) }
             
                // Checkout, to discard changes
                simpleGit( state.repos[state.repoNumber].localFolder)
                    .checkout(file, onGitCheckout );
                    function onGitCheckout(err, result){ console.log(result); console.log(err);  };

                
            }catch(err){
                console.log('discardLink -- caught error ');
                console.log(err);
            }
                
    
            // Git Status
            try{
                await simpleGit( state.repos[state.repoNumber].localFolder).status( onStatus );
                function onStatus(err, result ){ status_data = result; console.log(result); console.log(err) };
            }catch(err){
                console.log("discardLink -- Error " );
                console.log(err);
                return
            }

            origFiles = createFileTable(status_data); // Redraw, and update origFiles;
            break;
        }

        case 'deleteLink': {
            console.log('deleteLink');
            console.log(event);
            
            file = event;   
            try{
                 
                // Unstage (may not be needed, but no harm)
                 await simpleGit( state.repos[state.repoNumber].localFolder )
                    .raw( [  'reset', '--', file ] , onReset); 
                    function onReset(err, result) {console.log(result) }
                    
                // Delete from file system                   
                let filePath = state.repos[state.repoNumber].localFolder + pathsep + file;
                console.log('deleteLink -- deleting file = ' + filePath);
                fs.unlinkSync(filePath)
  
            }catch(err){
                console.log('deleteLink -- caught error ');
                console.log(err);
            }
                
    
            // Git Status
            try{
                await simpleGit( state.repos[state.repoNumber].localFolder).status( onStatus );
                function onStatus(err, result ){ status_data = result; console.log(result); console.log(err) };
            }catch(err){
                console.log("deleteLink -- Error " );
                console.log(err);
                return
            }

            origFiles = createFileTable(status_data); // Redraw, and update origFiles;
            break;
        }           
        
        case 'radioButtonChanged' : {
            // TODO : stage or unstage depending on what happened
            // see https://stackoverflow.com/questions/31705665/oncheck-listener-for-checkbox-in-javascript
            
            let checked = event.checked;
            let file2 = event.parentElement.innerText;
            //file2 = '"' + file2 + '"';
            
            if ( checked ) {
                await simpleGit( state.repos[state.repoNumber].localFolder )
                .add( [file2], onAdd );   
    
            } else {
                 await simpleGit( state.repos[state.repoNumber].localFolder )
                .raw( [  'reset', '--', file2 ] , onReset); 
            }
            // Local functions
            function onAdd(err, result) {console.log(result) ;console.log(err);}
            function onReset(err, result) {console.log(result) ;console.log(err);}

            break;
        }

    } // End switch
    
    // ---------------
    // LOCAL FUNCTIONS
    // ---------------

    function makeListOfUnstagedFiles(){
        let unStaged = [];
        
        var table = document.getElementById("listFilesTableBody");
        
        for (var i = 0, row; row = table.rows[i]; i++) {
            //iterate through rows
            //rows would be accessed using the "row" variable assigned in the for loop
            
            let col = row.cells[0]; // First column
        
            let isChecked = col.children[0].checked;
            let file  = col.children[1].innerText;
            if (isChecked == false) {
                unStaged.push(file);
            }

            console.log(col);

        }

        return unStaged;
    };


// ================= END CALLBACK =================  
}
//async function _loopTimer( delayInMs){
    
    //// Define timer
    //let timer = window.setInterval( _update, delayInMs );
    //return timer
    

    
//}
//async function _update(){
    //if(isPaused) {
        //return;
    //}
    
    
    //let folder = state.repos[state.repoNumber].localFolder;
    //let status_data;
    //try{
        //await simpleGit( folder).status( onStatus );
        //function onStatus(err, result ){ 
            //status_data = result; 
            //console.log(result); 
            //console.log(err);
            //createConflictingFileTable(document, status_data);
            //// createDeletedFileTable(document, status_data);  // CANNOT be updated because that changes checkboxes back
        //};
    //}catch(err){
        
    //}
    
//}

function closeWindow(){

    // Return
    
    localState.fileListWindow = false;  // Show to main program that window is closed
    win.close();
    
}

// Draw
function createFileTable(status_data) {

    var index = 10000; // Checkbox id
    let cell, row;
    let foundFiles = [];

        
    // Old tbody
    let old_tbody = document.getElementById('listFilesTableBody');


    // Table header (change onClick for history mode)
    if (localState.mode == 'HISTORY'){
        let commit = localState.historyHash;
        document.getElementById('diffAllSpan').setAttribute( 
            "onClick", 
            "_callback('diffLinkAll', " + "'" + commit  + "') " 
            );  // Send commit hash for history
    }

    // Make  a new tbody
    let tbody = document.createElement("tbody"); // Empty tbody
    tbody.setAttribute('id','listFilesTableBody');

    // Fill tbody with content
    for (let i in status_data.files) { 
        let fileStruct = status_data.files[i];
        let file = fileStruct.path;
        file = file.replace(/"/g,''); // Replace all "  -- solve git bug, sometimes giving extra "-characters
        
        let XY = fileStruct.index + fileStruct.working_dir;  // See : https://git-scm.com/docs/git-status
        
        console.log( '[' + XY + '] ' + fileStruct.path);
        
        // Remember found file
        foundFiles.push(file);
        
        let row = tbody.insertRow();

        //
        // First cell  --  Filename + icon + checkbox 
        //
            cell = row.insertCell();
            cell.setAttribute("class", 'localFolder');
            
            // Add checkbox to cell 
            if (localState.mode != 'HISTORY'){
                var checkbox = document.createElement('input');
                checkbox.setAttribute("name", "fileGroup");
                checkbox.setAttribute("onclick", "_callback('radioButtonChanged', this );" ) ; // Quotes around file
                checkbox.type = 'checkbox';
                checkbox.id = index;
                checkbox.checked = true;
                cell.appendChild(checkbox);
                
                // Adjust checkbox value according to localState.unstaged
                if ( localState.unstaged.includes(file) ){
                    checkbox.checked = false;
                }   
            }

            // Label
            let typeOfChanged;
            
            var label = document.createElement('label')
            label.htmlFor = index;
            switch (XY) {
                case "D " :
                    label.setAttribute("class","deleted"); // index+work_dir "D " " D"
                    typeOfChanged = 'deleted';
                    break;
                case " D" :
                    label.setAttribute("class","deleted"); // index+work_dir "D " " D"
                    typeOfChanged = 'deleted';
                    break;
                case "M " :
                    label.setAttribute("class","modified"); // index+work_dir "M " " M"
                    typeOfChanged = 'modified';
                    break;
                case " M" :
                    label.setAttribute("class","modified"); // index+work_dir "M " " M"
                    typeOfChanged = 'modified';
                    break;
                case "A " :
                    label.setAttribute("class","added"); // index+work_dir "A " "??"
                    typeOfChanged = 'added';
                    break;
                case "??" :
                    label.setAttribute("class","added"); // untracked (lets view it as added)
                    typeOfChanged = 'added';
                    break;
            
            }
            var description = document.createTextNode( file);
            label.appendChild(description);

            cell.appendChild(label);
  
        //
        // Second cell  --  action links 
        //      
            cell = row.insertCell();
            
            if (localState.mode == 'HISTORY'){
                // diff-link for history vs previous history
                let commit = localState.historyHash;
                cell.appendChild( diffLinkHistory( document, commit, file) );
                
            }else{ // NOT HISTORY
                // diff-link for working_dir and staged vs HEAD
                cell.appendChild( diffLink( document, file));
                 
                // Make restore link (only if modified or deleted) 
                if (typeOfChanged == 'modified' || typeOfChanged == 'deleted'){  
                    var discardLink = document.createElement('span');
                    discardLink.setAttribute('style', "color: blue; cursor: pointer");
                    discardLink.setAttribute('onclick',
                        "selectedFile = '"  + file + "';" + 
                        "document.getElementById('restoreDialog').showModal();" );  // Opens dialog from html-page
                    discardLink.textContent=" (restore)";
                    cell.appendChild(discardLink);         
                }   
                
                // Make delete link (only if modified or added) 
                if (typeOfChanged == 'modified' || typeOfChanged == 'added'){  
                    var discardLink = document.createElement('span');
                    discardLink.setAttribute('style', "color: blue; cursor: pointer");
                    discardLink.setAttribute('onclick',
                        "selectedFile = '"  + file + "';" + 
                        "document.getElementById('deleteDialog').showModal();" );  // Opens dialog from html-page
                    discardLink.textContent=" (delete)";
                    cell.appendChild(discardLink);         
                }                     
            }
            // Internal functions
            
            function diffLink(document, file){
                // Make diff link (work_dir)
                var diffLink = document.createElement('span');
                if (typeOfChanged == 'modified'){ // two files to compare only in modified (only one file in deleted or added)
                    diffLink.setAttribute('style', "color: blue; cursor: pointer");
                    diffLink.setAttribute('onclick', "_callback('diffLink'," + "'"  + file + "')");
                    diffLink.textContent=" (diff)";
                    return  diffLink;
                }else{
                    diffLink.innerHTML="";
                    return  diffLink;
                }
            };
             
            function diffLinkHistory(document, commit, file){
                // Make diff link (history)
                var diffLink = document.createElement('span');
                if (typeOfChanged == 'modified'){  // two files to compare only in modified (only one file in deleted or added)
                    diffLink.setAttribute('style', "color: blue; cursor: pointer");
                    diffLink.setAttribute('onclick', "_callback('diffLinkHistory', " + "'" + commit + "', '" + file + "') ");
                    diffLink.textContent=" (diff)";
                    return  diffLink;
                }else{
                    diffLink.innerHTML="";
                    return  diffLink;
                }
            };    
            
        //
        // Button
        //      
        
            if (localState.mode == 'HISTORY'){            
                document.getElementById("applyButtonDiv").style.display = "none"; 
                document.getElementById("applyButtonDiv").style.height= '0px';      
                
            }
            // ================= END  Internal functions  in  createFileTable =================

            
            
        index = index + 1;
    }
        
    // Replace old tbody content with new tbody
    old_tbody.parentNode.replaceChild(tbody, old_tbody);

    
    return foundFiles;
}

