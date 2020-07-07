
// ---------
// INIT
// ---------
var gui = require("nw.gui"); // TODO : don't know if this will be needed
var os = require('os');
        
const simpleGit = require('simple-git');  



var state = global.state; // internal copy of global.state
var localState = global.localState; 

var win

// ---------
// FUNCTIONS
// ---------     
function _callback( name, event){
    console.log('_callback = ' + name);
    switch(name) {
      case 'checkboxChanged':
        console.log('checkboxChanged');
        console.log(event);
        let field = event.id;
        let value = event.checked;
        state[field] = value;
        break;

      default:
        // code block
    }
  
}

function injectIntoSettingsJs(document) {
    win = gui.Window.get();
    
    console.log('Settings - settings.js entered');  
    console.log('Settings - state :');  
    console.log(global.state);
    
    // Set values according to state variable
    document.getElementById('alwaysOnTop').checked = state.alwaysOnTop;
    document.getElementById('forceCommitBeforeBranchChange').checked = state.forceCommitBeforeBranchChange;
    
    // Build repo table
    createHtmlTable(document);

};

async function createHtmlTable(document){
    
    console.log('Settings - createHtmlTable entered');
    console.log('Settings - document :');
    console.log(document)
    
    // Create table if there are any repos
    if (state.repos.length > 0){        
        
        // Repo table           
            //document.getElementById("header_Forget").style.visibility = "visible"; 
            document.getElementById("emptyTable_iFrame").style.height ="0px";
            
            let table = document.getElementById("settingsTableBody");
            let data = Object.keys(state.repos[0]);
            console.log('Settings - data repos:');
            console.log(data);
            
            
                
            // Ammend data with a field for remote repo
            for (let i in state.repos) {
                let configList;
                try{
                    configList = await gitConfigList( state.repos[i].localFolder ); 
                    state.repos[i].remoteURL = configList["remote.origin.url"];
                    console.log( state.repos[i].localFolder);
                    console.log( configList["remote.origin.url"]);   
                }catch(err){
                    configList = [];
                    console.log( state.repos[i].localFolder);
                    console.log( 'Caught error');
                }
            }   
            
            generateRepoTable( document, table, state.repos); // generate the table first
            
        // Current branch table
            //document.getElementById("branch_Modify").style.visibility = "visible"; 
            document.getElementById("emptyBranchTable_iFrame").style.height ="0px";
            
            let table2 = document.getElementById("branchesTableBody");
            let data2 = Object.keys(state.repos[0]);
            console.log('Settings - data branches:');
            console.log(data2);
            let branchList = await gitBranchList();
            generateBranchTable( document, table2, branchList); // generate the table first
            
        
        // Show current repo
        document.getElementById("currentRepo").innerHTML = state.repos[state.repoNumber].localFolder;
        
        
    }else{ 

        // Hide everything that does not apply to empty folder   
        document.getElementById('hide').style.display = "none";
        
        
        document.getElementById("emptyTable_iFrame").style.height ="auto"; 

   }
   
   //
   // Local functions
   //
    async function gitConfigList( localFolder ){
    let configList;
    
    try{
        await simpleGit(localFolder).listConfig(onConfigList);
        function onConfigList(err, result ){console.log(result); configList = result.all};
        console.log(configList);
        
    }catch(err){        
        console.log('Error determining remote URL, in gitConfigList');
        console.log(err);
    }
    return configList
    }
   
   
   async function gitBranchList(){
    let branchList;
    
    try{
        await simpleGit(state.repos[state.repoNumber].localFolder).branch(['--list'], onBranchList);
        function onBranchList(err, result ){console.log(result); branchList = result.all};
    }catch(err){        
        console.log('Error determining local branches, in gitBranchList');
        console.log(err);
    }
    return branchList
    }


}
function generateRepoTable(document, table, data) {
    var index = 0; // Used to create button-IDs
 
    
    // Loop rows in data
    for (let element of data) {
        console.log('Element = ' + element );
 
        //
        // Add repos to table
        //
        let cell, text, button, textarea
        let row = table.insertRow();
              
        // Add column of buttons
        cell = row.insertCell();
        cell.setAttribute("class", 'action');
        
        button = document.createElement('button');
        button.setAttribute("id", index);
        button.innerHTML = 'Forget';
        button.onclick = forgetButtonClicked;

        cell.appendChild(button);
        
    
         //  Column Repo-path
        cell = row.insertCell();
        cell.setAttribute("class", 'localFolder');
        text = document.createTextNode( element.localFolder );
        cell.appendChild(text);

          
         //  Column Remote URL textarea
        cell = row.insertCell();
        cell.setAttribute("class", 'remoteURL');
        
        textarea = document.createElement('textarea');
        textarea.setAttribute("id", index);
        textarea.innerHTML = element.remoteURL;
        //textarea.onclick = forgetButtonClicked;

        cell.appendChild(textarea);
 
        // counter update
        index ++;
    }
    console.log(table);
}
function generateBranchTable(document, table, branchlist) {
    var index = 0; // Used to create button-IDs
    let cell, text, button;
 
 
    //
    // Add branches to table
    //
       
    // Loop rows in data
    for (let element of branchlist) {
        console.log('Element = ' + element );
        let row = table.insertRow();
        
        
        // Add column of buttons
        cell = row.insertCell();
        cell.setAttribute("class", 'action');
        
        button = document.createElement('button');
        button.setAttribute("id", index);
        button.innerHTML = 'Delete';
        button.onclick = forgetButtonClicked;
        cell.appendChild(button);
        
        // Hide button and callback
        button.style.display = "none";  
        button.onclick = forgetButtonClicked;  
        
    
         //  Column Branch name textarea
        cell = row.insertCell();
        cell.setAttribute("class", 'branchName');
        text = document.createTextNode( element );
        cell.appendChild(text);



        index ++;
    }
    console.log(table);
    
    //
    // Add branch (extra row at end)
    //
    let row = table.insertRow();
    
    cell = row.insertCell();
    cell.setAttribute("class", 'action');
    
    button = document.createElement('button');
    button.setAttribute("id", index);
    button.innerHTML = 'Add';
    button.onclick = forgetButtonClicked;
    cell.appendChild(button);
    
    // Hide button and callback
    //button.style.display = "none";  
    button.onclick = forgetButtonClicked;     
    
    
    
      //  Column Branch name textarea
    cell = row.insertCell();
    cell.setAttribute("class", 'branchName');
    
    textarea = document.createElement('textarea');
    textarea.setAttribute("id", index);
    textarea.innerHTML = "";
    //textarea.onclick = forgetButtonClicked;
    
    cell.appendChild(textarea);

   
}

function forgetButtonClicked(event){
    let index = event.currentTarget.getAttribute('id');
    console.log('Settings - button clicked');
    console.log('Settings - event id = ' + index);


    console.log('Settings - state.repos before and after removal of clicked element : ');
    console.log(state.repos);
    
    console.log('Settings - removing index = ' + index);
    state.repos.splice(index,1); // Remove index
    console.log(state.repos);

    
    // Point repoNumber to first repo in list
    state.repoNumber = 0;
    
    if ( state.repos.length == 0){
        let tempRepoNumber = -1;
        state.repoNumber = tempRepoNumber;
        //global.localState.mode = 'UNKNOWN';  // exposed variable from app.js
    }

    
    // Replace table 
    document.getElementById("settingsTableBody").innerHTML = ""; 
    createHtmlTable(document);
    

    console.log('Settings - updating table :');
    
    //generateRepoTable( document, table, state.repos); // generate the table first
}
function closeWindow(){
    
    // Return
    localState.mode = 'UNKNOWN';
    
}
 
 // NOTES :
    
    // Find all open windows
    //chrome.windows.getAll({populate: true}, function(wins){
        //console.log("windows", wins)
    //})
    
    ////var n = 1;
    ////chrome.windows.getAll({populate: true}, getAllResponse)
    ////function getAllResponse(wins) { console.log("windows", wins); getOneWindow(wins,n)}
    ////function getOneWindow(wins,n) { 
        
        ////console.log("Tab 0 window" + n , wins[n].tabs[0] ); 
        ////console.log("Tab 0 name,  window " + n , wins[n].tabs[0].title ); 
        ////console.log("Tab 0 name,  window " + n , wins[n].window ); 
        //////win = nw.Window.get().cWindow.tabs[0].title
    ////}
    
        //console.log('settings dialog pressed');
    
    //// TODO : Here settings can be done.  For instance remote git linking
    
    //var output;
    //try{
        //await simpleGit(state.repos[state.repoNumber].localFolder).log( (err, result) => {console.log(result); output = result;} );
    //}catch(err){        
        //console.log(err);
    //}   
    
    //var history = output.ListLogSummary.all;
