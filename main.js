const { app, BrowserWindow, ipcMain } = require('electron')
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs')
const databaseLocation = "./pie.db"
const {v4 : uuidv4} = require('uuid')
const bcrypt = require('bcrypt')

const saltRounds = 10
const system_user = "SYSTEM"
let currentUserData = null
let win
let newAccWin


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
    // log table
    db.run('CREATE TABLE log(date text, log text, userid text)')
    
    log("CREATING DATABASE FROM FRESH && CREATED LOG TABLE")
    // user table
    db.run('CREATE TABLE user(name text, password text, level numeric, id text)')
    
    log("CREATED USER TABLE")

    return true
}

function log(message){
  let user;
  if(currentUserData){
    user = currentUserData.id
  }else{
    //system log
    user = system_user
  }
  
  let db = new sqlite3.Database(databaseLocation)

  let q = `INSERT INTO log(date, log, userid) VALUES("${new Date().toISOString()}", "${message}", "${user}")`

  db.run(q, (err)=>{
    if(err){
      console.log(err.message)
    }
  })
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

function getUserList(){
  //generates real time userlist to populate user table

  //only send data if admin
  if(currentUserData.level == 0){
    let db = new sqlite3.Database(databaseLocation)
    db.all("SELECT name, level, id FROM 'user'", (err, rows) => {
      if(!err){
        if(rows){
          win.webContents.send("updatedUserList", rows)
        }
      }
    })

  }
}

function createWindow () {
  
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    // transparency and frameless pretty cool, might add later though
    //frame: false,
    //transparent: true,
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
  let db = new sqlite3.Database(databaseLocation)

  bcrypt.genSalt(saltRounds, (err, salt) => {
    if(err){
      flash(err.message, 3)
    }
    bcrypt.hash(data.pass, salt, (err, hash) => {
      if(err){
        flash(err.message, 3)
      }else{
        let q = `INSERT INTO user(name, password, level, id) VALUES("${data.user}", "${hash}", ${data.level}, "${uuidv4()}")`

      db.run(q, (err) => {
        if(err){
          flash(err.message, 3)
        }else{
          flash("Successfully Registered Account", 1)
          log(`USER ACCOUNT ${data.user} CREATED`)
          getUserList()
          win.webContents.send("register")
        }
      })
      }
    })
  })


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
        let s = `FAILED LOG IN ATTEMPT - ${data.user}`
        log(s)
      flash("Invalid Login", 3)
    }else{
      bcrypt.compare(data.pass, row.password, (err, res)=>{
        if(err){
          flash(err.message, 3)
        }
        if(res){
          let result = {"level" : row.level, "id" : row.id}
          currentUserData = result;
          getUserList()
          flash("Successful Log-In", 1)
          let s = `${data.user} HAS LOGGED IN`
          log(s)
          win.webContents.send("login-successful", result)
        }else{
          let s = `FAILED LOG IN ATTEMPT - ${data.user}`
          log(s)
          flash("Invalid Login", 3)
        }
      })
    }

  })
}