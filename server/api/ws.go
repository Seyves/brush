package api

import (
	"brush/storage"
	"brush/types"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strconv"

	"github.com/gorilla/websocket"
)

type ConnectionInfo struct {
	Name  string
	Color types.Color
}

type Connections = map[*websocket.Conn]ConnectionInfo

var connections = Connections{}

func GetConnections() Connections {
    return connections 
}

func GetConnection(conn *websocket.Conn) (ConnectionInfo, bool) {
    info, isExist := GetConnections()[conn]

    return info, isExist
}

func AddConnection(conn *websocket.Conn, info ConnectionInfo) {
    connections = GetConnections()

    connections[conn] = info
}

func RemoveConnection(conn *websocket.Conn) {
    delete(GetConnections(), conn)
}

func writeError(conn *websocket.Conn, code int, msg string) {
	jsonStr := fmt.Sprintf("{\"error\": \"%s\"", msg)

	conn.WriteMessage(code, []byte(jsonStr))
}

func broadcast(conn *websocket.Conn, outcoming *types.OutcomingMessage) {
	for anotherConn := range GetConnections() {
		if conn == anotherConn {
			continue
		}

		stringified, err := json.Marshal(outcoming)

		if err != nil {
            log.Print(err)
			return
		}

		anotherConn.WriteMessage(1, stringified)
	}
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func WebsocketHandler(w http.ResponseWriter, r *http.Request) {
	nameParam := r.URL.Query().Get("name")

	if nameParam == "" {
		return
	}

	for _, connInfo := range GetConnections() {
		if connInfo.Name == nameParam {
			return
		}
	}

    ctx := context.Background()

	respHeader := http.Header{}

	color := types.Color{
		Red:   byte(rand.Uint32()),
		Green: byte(rand.Uint32()),
		Blue:  byte(rand.Uint32()),
	}

	respHeader.Add("X-Color", color.GetHex())

	conn, err := upgrader.Upgrade(w, r, respHeader)

	if err != nil {
		log.Println(err)
		return
	}

    key := fmt.Sprintf("$.%s", nameParam)

	defer func() {
        RemoveConnection(conn)

		outcomingUnregNotify := types.OutcomingMessage{
			Initiator: nameParam,
			Message: types.IncomingMessage{
				Cmd:     "unreg",
				Payload: "",
			},
		}

        storage.Redis.JSONDel(ctx, "draws", key)
        storage.Redis.JSONDel(ctx, "lastPositions", key)

		broadcast(conn, &outcomingUnregNotify)

		conn.Close()
	}()

    storage.Redis.JSONSet(ctx, "draws", key, "[]").Val()

    connInfo := ConnectionInfo{
		Name:  nameParam,
		Color: color,
	}

	AddConnection(conn, connInfo)

	outcomingRegNotify := types.OutcomingMessage{
		Initiator: nameParam,
		Message: types.IncomingMessage{
			Cmd:     "reg",
			Payload: color.GetHex(),
		},
	}

	broadcast(conn, &outcomingRegNotify)

	for {
		_, message, err := conn.ReadMessage()

		if err != nil {
			log.Println(message, err)
			break
		}

		var parsedMessage types.IncomingMessage

		parseErr := json.Unmarshal(message, &parsedMessage)

		if parseErr != nil {
			log.Println(parseErr)
			break
		}

		myConnInfo, isRegistered := GetConnection(conn)

		if !isRegistered {
			writeError(conn, 404, "Can't find you :(")
			continue
		}

		outcoming := types.OutcomingMessage{
			Initiator: myConnInfo.Name,
			Message:   parsedMessage,
		}

		if parsedMessage.Cmd == "line" || parsedMessage.Cmd == "end-line" || parsedMessage.Cmd == "move" {
            err := storage.Redis.JSONSet(ctx, "lastPositions", key, message).Err()

			if err != nil {
				log.Print(err)
				break
			}
		}

		if parsedMessage.Cmd == "line" || parsedMessage.Cmd == "end-line" {
            err := storage.Redis.JSONArrAppend(ctx, "draws", key, message).Err()

			if err != nil {
				log.Print(err)
				break
			}
		}

		if parsedMessage.Cmd == "undo" {
			eraseUntil, err := strconv.Atoi(parsedMessage.Payload)

			if err != nil {
				log.Print(err)
				break
			}

			myDrawsStringified, err := storage.Redis.JSONGet(ctx, "draws", key).Result()

			if err != nil {
				log.Print(err)
				break
			}

            myDrawsStringified = myDrawsStringified[1:len(myDrawsStringified)-1]

            var myDraws []types.IncomingMessage

            parseErr := json.Unmarshal([]byte(myDrawsStringified), &myDraws)

			if parseErr != nil {
				log.Print(err)
				break
			}

			undoneDraws := myDraws[0:eraseUntil]

            storage.Redis.JSONSet(ctx, "draws", key, undoneDraws)

			bytes, err := json.Marshal(undoneDraws)

			outcoming.Message.Payload = string(bytes)
		}

		broadcast(conn, &outcoming)
	}
}
