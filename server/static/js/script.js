import * as api from "./api.js"

const store = {
    users: {},
    canvases: {},
    myColor: null,
    cursors: {},
}

const button = document.getElementById("button")
const fscreen = document.getElementById("fscreen")
const sscreen = document.getElementById("sscreen")

function createCanvas() {
    const canv = document.createElement("canvas")

    sscreen.append(canv)

    canv.width = window.innerWidth
    canv.height = window.innerHeight; 
    canv.classList.add("canvas")

    return canv.getContext("2d")
}

function createCursorElem(name, color) {
    const elem = document.createElement("div")
    const svg = document.createElement("div")
    const nameE = document.createElement("p")

    elem.append(svg)
    elem.append(nameE)

    svg.innerHTML = `
        <svg fill="${color}" height="20px" width="20px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
             viewBox="0 0 376.754 376.754" xml:space="preserve">
        <g>
            <path d="M44.072,0v376.754L156.699,241.53l175.982,0.643L44.072,0z M142.686,211.478l-68.613,82.38V64.335L249.896,211.87
                L142.686,211.478z"/>
        </g>
        </svg>
    `

    nameE.innerText = name

    elem.classList.add("cursor")

    sscreen.append(elem)

    return elem
}

button.addEventListener("click", signIn)

sscreen.hidden = true

async function signIn(e) {
    e.preventDefault()

    const nameInput = document.getElementById("name")

    const myName = nameInput.value

    const users = await api.getUsers()

    if (users.hasOwnProperty(myName)) {
        return null
    }
    store.users = users     

    const wsClient = api.wsConnect(myName)

    wsClient.connection.onopen = async function() {
        store.myColor = await api.getUsersColor(myName)

        const myCtx = createCanvas()

        fscreen.remove()
        sscreen.hidden = false 

        const draws = await api.getExistingDraws()

        for (const name in draws) {
            const ctx = createCanvas()
            store.canvases[name] = ctx

            for (const msg of draws[name]) {
                processIncomingMessage(name, msg)
            }
        }

        for (const user in store.users) {
            store.cursors[user] = createCursorElem(user, store.users[user])
        }

        const throttledMove = createThrottler(function(position) {
            wsClient.move(position)
        }, 70)

        function moveCursor(e) {
            const position = {x: e.pageX, y: e.pageY}

            throttledMove(position)
        }

        function startDrawing() {
            const throttledDraw = createThrottler(function(position) {
                myCtx.lineJoin = "round"
                myCtx.lineWidth = 9
                myCtx.strokeStyle = store.myColor
                myCtx.lineTo(position.x, position.y)
                myCtx.stroke()
                wsClient.line(position)
            }, 20)

            function draw(e) {
                const position = {x: e.pageX, y: e.pageY}

                throttledDraw(position)
            }

            function stopDrawing() {
                myCtx.stroke()
                myCtx.beginPath()
                wsClient.endLine()

                document.addEventListener("pointermove", moveCursor)
                document.removeEventListener("pointermove", draw)
                document.removeEventListener("pointerup", stopDrawing)
            }

            document.removeEventListener("pointermove", moveCursor)
            document.addEventListener("pointermove", draw)
            document.addEventListener("pointerup", stopDrawing)
        }

        document.addEventListener("pointerdown", startDrawing)
        document.addEventListener("pointermove", moveCursor)
    }

    wsClient.connection.addEventListener("message", (incm) => {
        const parsed = JSON.parse(incm.data)

        processIncomingMessage(parsed.initiator, parsed.message)
    })
}

function createThrottler(callback, delay) {
    let prevStamp = null

    return function (args) {
        const nowStamp = new Date().getTime()

        if (!prevStamp) {
            callback(args)
        } else {
            if (nowStamp - prevStamp < delay) return
            callback(args)
        }

        prevStamp = nowStamp
    }
}

function processIncomingMessage(initiator, message) {
    switch (message.cmd) {
        case "reg": {
            store.users[initiator] = message.payload
            store.cursors[initiator] = createCursorElem(initiator, message.payload)
            break
        }

        case "line": {
            let ctx = store.canvases[initiator]

            if (!ctx) {
                ctx = createCanvas()
                store.canvases[initiator] = ctx
            }

            const [x, y] = message.payload.split(";")

            ctx.lineJoin = "round"
            ctx.lineWidth = 9
            ctx.strokeStyle = store.users[initiator]
            ctx.lineTo(x, y)
            ctx.stroke()

            const cursor = store.cursors[initiator]

            if (!cursor) return

            cursor.style.transform = `translate(${x}px, ${y}px)`

            break
        }

        case "end-line": {
            let ctx = store.canvases[initiator]

            ctx.stroke()
            ctx.beginPath()
            break
        }

        case "move": {
            const cursor = store.cursors[initiator]

            if (!cursor) return

            const [x, y] = message.payload.split(";")

            cursor.style.transform = `translate(${x}px, ${y}px)`
            break
        }
    }
}

function createLine(ctx, color) {
    let prevPos = null 
    
    return function (position) {
        if (!prevPos) prevPos = position

        ctx.strokeStyle = color 
        ctx.beginPath()
        ctx.moveTo(prevPos.x, prevPos.y)
        ctx.lineWidth = 9
        ctx.lineTo(position.x, position.y)
        ctx.stroke()
        ctx.closePath()

        prevPos = position
    }
}