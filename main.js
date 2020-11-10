const { app, BrowserWindow, ipcMain } = require('electron')
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs')
const databaseLocation = "./pie.db"
let win


function createDB(){
    //first run. Create a database.
    console.log("... ")

    let db = new sqlite3.Database(databaseLocation, (err) =>{
        if(err){
            console.log(err.message);
        }else{
            console.log("Created Database...")
        }
    })

    return db
}

function firstTimeDB(db){
    // this will run all of the sql scripts to populate the database
    console.log("Populating Database...")
    db.run('CREATE TABLE user(name text, password text, level numeric)')
    return true
}

function checkForUsers(){
  
  let db = new sqlite3.Database(databaseLocation)
  db.get("SELECT * FROM 'user' LIMIT 0,30", (err, row)=>{
    if(err){
      flash(err.message, 3)
    }
    if(row == undefined){
      win.webContents.send("firstTimeRun", true)
    }else{
      win.webContents.send("confirmation", true)
    }
  })
}

function createWindow () {
  
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true
    }
  })

  win.loadFile('index.html')
  
  ipcMain.on("mainWindowLoaded", ()=>{
      console.log("Main Window Loaded.")
      // check if database is ready.
      console.log("Checking For Database.")

      if(!fs.existsSync(databaseLocation)){
        console.log("First Run Detected, Creating database.")
        win.webContents.send("confirmation", false)
        let db = createDB()
        if(firstTimeDB(db)){
            win.webContents.send("firstTimeRun", true)
        }
      }else{
        checkForUsers()
      }

  })
  ipcMain.on("create-user", (evt, result) => {
    createAccount(result)
  })
  ipcMain.on("login", (evt, results) => {
    let userData = logIn(results)
    console.log(userData)
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

function flash(message, level){
  win.webContents.send("flash", {"message" : message, "level" : level})
}

function createAccount(data){
  if(data.level == 0){
    console.log("Creating Admin Account")
    let db = new sqlite3.Database(databaseLocation)

    let q = `INSERT INTO user(name, password, level) VALUES("${data.user}", "${data.pass}", ${data.level})`

    db.run(q, (err) => {
      if(err){
        flash(err.message, 3)
      }else{
        flash("Successfully Registered Admin Account", 1)
        win.webContents.send("register")
      }
    })
  }
}


function logIn(data){
  
  let db = new sqlite3.Database(databaseLocation)

  let q = `SELECT * FROM user WHERE name = '${data.user}'`

  db.get(q, (err, row)=>{
    if(err){
      console.level(err.message)
    }
    if(!row){
      //no user of that name
      flash("Invalid Login", 3)
    }else{
      if(row.password == data.pass){
        //successful log in
        let result = {"level" : row.level, "user" : row.name}
        flash("Successful Log-In", 1)
        win.webContents.send("login-successful", result)
      }else{
        //wrong password
        flash("Invalid Login", 3)
      }
    }

  })
}