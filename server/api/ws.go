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

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
)

type ConnectionInfo struct {
	Name  string
	Color types.Color
}

type RoomConnections = map[*websocket.Conn]ConnectionInfo

type AllConnections = map[string]RoomConnections

var connections = AllConnections{}

func GetConnections(roomId string) RoomConnections {
	return connections[roomId]
}

func GetConnection(roomId string, conn *websocket.Conn) (ConnectionInfo, bool) {
	info, isExist := GetConnections(roomId)[conn]

	return info, isExist
}

func CreateConnectionsRoom(roomId string) {
	connections[roomId] = RoomConnections{}
}

func RemoveConnectionsRoom(roomId string) {
	delete(connections, roomId)
}

func AddConnection(roomId string, conn *websocket.Conn, info ConnectionInfo) {
	connections := GetConnections(roomId)

	connections[conn] = info
}

func RemoveConnection(roomId string, conn *websocket.Conn) {
	delete(GetConnections(roomId), conn)
}

func sendWSError(conn *websocket.Conn, code int, msg string) {
	jsonStr := fmt.Sprintf("{\"error\": \"%s\"", msg)

	conn.WriteMessage(code, []byte(jsonStr))
}

func logWSError(action string, err error) {
	log.Println(fmt.Sprintf("[websoketHandler] Error while %s: ", action), err)
}

func broadcast(roomId string, conn *websocket.Conn, outcoming *types.OutcomingMessage) {
	for anotherConn := range GetConnections(roomId) {
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
	roomId := chi.URLParam(r, "roomId")
	myName := r.URL.Query().Get("name")

	ctx := context.Background()

	isRoomExist, err := storage.Redis.Exists(ctx, roomId).Result()

	if isRoomExist == 0 || err != nil {
		return
	}

	if myName == "" {
		return
	}

    for _, connInfo := range GetConnections(roomId) {
        if connInfo.Name == myName {
            return
        }
    }

	respHeader := http.Header{}

	myColor := types.Color{
		Red:   byte(rand.Uint32()),
		Green: byte(rand.Uint32()),
		Blue:  byte(rand.Uint32()),
	}

	respHeader.Add("X-Color", myColor.GetHex())

	conn, err := upgrader.Upgrade(w, r, respHeader)

	if err != nil {
		log.Println(err)
		return
	}

	defer func() {
		RemoveConnection(roomId, conn)

		if len(GetConnections(roomId)) == 0 {
			storage.Redis.JSONDel(ctx, roomId, fmt.Sprintf("$"))
			RemoveConnectionsRoom(roomId)
		} else {
			outcomingUnregNotify := types.OutcomingMessage{
				Initiator: myName,
				Message: types.IncomingMessage{
					Cmd:     "unreg",
					Payload: "",
				},
			}

			broadcast(roomId, conn, &outcomingUnregNotify)

			storage.Redis.JSONDel(ctx, roomId, fmt.Sprintf("$.draws.%s", myName))
			storage.Redis.JSONDel(ctx, roomId, fmt.Sprintf("$.lastPositions.%s", myName))
		}

		conn.Close()
	}()

	storage.Redis.JSONSet(ctx, roomId, fmt.Sprintf("$.draws.%s", myName), "[]").Val()

	connInfo := ConnectionInfo{
		Name:  myName,
		Color: myColor,
	}

	AddConnection(roomId, conn, connInfo)

	outcomingRegNotify := types.OutcomingMessage{
		Initiator: myName,
		Message: types.IncomingMessage{
			Cmd:     "reg",
			Payload: myColor.GetHex(),
		},
	}

	broadcast(roomId, conn, &outcomingRegNotify)

	for {
		_, message, err := conn.ReadMessage()

		if err != nil {
			logWSError("reading incoming message", err)
			break
		}

		var incomingMsg types.IncomingMessage

		err = json.Unmarshal(message, &incomingMsg)

		if err != nil {
			logWSError("parsing incoming message", err)
			break
		}

		outcomingMsg := types.OutcomingMessage{
			Initiator: myName,
			Message:   incomingMsg,
		}

		if incomingMsg.Cmd == "line" || incomingMsg.Cmd == "end-line" || incomingMsg.Cmd == "move" {
			err := storage.Redis.JSONSet(ctx, roomId, fmt.Sprintf("$.lastPositions.%s", myName), message).Err()

			if err != nil {
				logWSError("setting last position", err)
				break
			}
		}

		if incomingMsg.Cmd == "line" || incomingMsg.Cmd == "end-line" {
			err := storage.Redis.JSONArrAppend(ctx, roomId, fmt.Sprintf("$.draws.%s", myName), message).Err()

			if err != nil {
				logWSError("adding draw", err)
				break
			}
		}

		if incomingMsg.Cmd == "undo" {
			eraseUntil, err := strconv.Atoi(incomingMsg.Payload)

			if err != nil {
				logWSError("parsing undo index", err)
				break
			}

			myDrawsStringified, err := storage.Redis.JSONGet(ctx, roomId, fmt.Sprintf("$.draws.%s", myName)).Result()

			if err != nil {
				logWSError("getting undo user draws", err)
				break
			}

			myDrawsStringified = myDrawsStringified[1 : len(myDrawsStringified)-1]

			var myDraws []types.IncomingMessage

			err = json.Unmarshal([]byte(myDrawsStringified), &myDraws)

			if err != nil {
				logWSError("parsing undo draws", err)
				break
			}

			undoneDraws := myDraws[0:eraseUntil]

			storage.Redis.JSONSet(ctx, roomId, fmt.Sprintf("$.draws.%s", myName), undoneDraws)

			bytes, err := json.Marshal(undoneDraws)

			outcomingMsg.Message.Payload = string(bytes)
		}

		broadcast(roomId, conn, &outcomingMsg)
	}
}
