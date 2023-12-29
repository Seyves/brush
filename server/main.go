package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
)

type Color struct {
	red   byte
	green byte
	blue  byte
}

func (color *Color) getHex() string {
	return fmt.Sprintf("#%02X%02X%02X", color.red, color.green, color.blue)
}

type IncomingMessage struct {
	Cmd     string `json:"cmd"`
	Payload string `json:"payload"`
}

type OutcomingMessage struct {
	Initiator string          `json:"initiator"`
	Message   IncomingMessage `json:"message"`
}

type ConnectionInfo struct {
	Name  string
	Color Color
}

var connections = map[*websocket.Conn]ConnectionInfo{}

var drawStore = map[string][]IncomingMessage{}
var lastPositions = map[string]IncomingMessage{}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func main() {
	r := chi.NewRouter()

	r.Route("/api", func(r chi.Router) {
		r.Get("/ws", websocketHandler)
		r.Get("/users", getNamesHandler)
		r.Get("/draws", getDrawsHandler)
		r.Get("/last-positions", getLastPositionsHandler)
		r.Get("/color/{user}", getColorHandler)
	})

	r.Handle("/*", http.FileServer(http.Dir("./static")))

	http.ListenAndServe(":9000", r)
}

var cns = &connections

func getNamesHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	namesMap := map[string]string{}

	for _, connInfo := range *cns {
		namesMap[connInfo.Name] = connInfo.Color.getHex()
	}

	jsonStr, err := json.Marshal(namesMap)
	w.Header().Add("Content-Type", "application/json")

	if err != nil {
		w.WriteHeader(500)
		return
	}

	w.WriteHeader(200)
	w.Write(jsonStr)
}

func getColorHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")

	name := chi.URLParam(r, "user")

	for _, connInfo := range *cns {
		if connInfo.Name == name {
			w.WriteHeader(200)
			w.Write([]byte(connInfo.Color.getHex()))
			return
		}
	}

	w.WriteHeader(404)
}

func getDrawsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	jsonStr, err := json.Marshal(drawStore)

	if err != nil {
		w.WriteHeader(500)
		return
	}

	w.Header().Add("Content-Type", "application/json")
	w.WriteHeader(200)
	w.Write(jsonStr)
}

func getLastPositionsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	jsonStr, err := json.Marshal(lastPositions)

	if err != nil {
		w.WriteHeader(500)
		return
	}

	w.Header().Add("Content-Type", "application/json")
	w.WriteHeader(200)
	w.Write(jsonStr)
}

func broadcast(conn *websocket.Conn, outcoming *OutcomingMessage) {
	for anconn := range *cns {
		if conn == anconn {
			continue
		}

		stringified, err := json.Marshal(outcoming)

		if err != nil {
			return
		}

		anconn.WriteMessage(1, stringified)
	}
}

func writeError(conn *websocket.Conn, code int, msg string) {
	jsonStr := fmt.Sprintf("{\"error\": \"%s\"", msg)

	conn.WriteMessage(code, []byte(jsonStr))
}

func websocketHandler(w http.ResponseWriter, r *http.Request) {
	nameParam := r.URL.Query().Get("name")

	if nameParam == "" {
		return
	}

	for _, connInfo := range *cns {
		if connInfo.Name == nameParam {
			return
		}
	}

	respHeader := http.Header{}

	color := Color{
		red:   byte(rand.Uint32()),
		green: byte(rand.Uint32()),
		blue:  byte(rand.Uint32()),
	}

	respHeader.Add("X-Color", color.getHex())

	conn, err := upgrader.Upgrade(w, r, respHeader)

	if err != nil {
		log.Println(err)
		return
	}

	defer func() {
		delete(*cns, conn)

		outcomingUnregNotify := OutcomingMessage{
			Initiator: nameParam,
			Message: IncomingMessage{
				Cmd:     "unreg",
				Payload: "",
			},
		}

		delete(drawStore, nameParam)
		delete(lastPositions, nameParam)

		broadcast(conn, &outcomingUnregNotify)

		conn.Close()
	}()

	(*cns)[conn] = ConnectionInfo{
		Name:  nameParam,
		Color: color,
	}

	outcomingRegNotify := OutcomingMessage{
		Initiator: nameParam,
		Message: IncomingMessage{
			Cmd:     "reg",
			Payload: color.getHex(),
		},
	}

	broadcast(conn, &outcomingRegNotify)

	for {
		_, message, err := conn.ReadMessage()

		if err != nil {
			log.Println(message, err)
			break
		}

		var parsedMessage IncomingMessage

		parseErr := json.Unmarshal(message, &parsedMessage)

		if parseErr != nil {
			log.Println(parseErr)
			break
		}

		myConnInfo, isRegistered := (*cns)[conn]

		if !isRegistered {
			writeError(conn, 404, "Can't find you :(")
			continue
		}

		outcoming := OutcomingMessage{
			Initiator: myConnInfo.Name,
			Message:   parsedMessage,
		}

		if parsedMessage.Cmd == "line" || parsedMessage.Cmd == "end-line" || parsedMessage.Cmd == "move" {
			lastPositions[myConnInfo.Name] = parsedMessage
		}

		if parsedMessage.Cmd == "line" || parsedMessage.Cmd == "end-line" {
			_, isExist := drawStore[myConnInfo.Name]

			if !isExist {
				drawStore[myConnInfo.Name] = []IncomingMessage{}
			}

			drawStore[myConnInfo.Name] = append(drawStore[myConnInfo.Name], parsedMessage)
		}

		broadcast(conn, &outcoming)
	}
}
