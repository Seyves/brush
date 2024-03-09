package api

import (
	"brush/storage"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func sendOk(w http.ResponseWriter, data []byte) {
    w.WriteHeader(200)
    w.Write(data)
}

func sendError(w http.ResponseWriter, code int, message string) {
    w.WriteHeader(code)
    w.Write([]byte(fmt.Sprintf("{message: \"%s\"}", message)))
}

func CreateRoom(w http.ResponseWriter, r *http.Request) {
    ctx := context.Background()

    id := uuid.New() 

    err := storage.Redis.JSONSet(ctx, id.String(), "$", "{\"draws\": {}, \"lastPositions\": {}}").Err()

    if err != nil {
        log.Print("[CreateRoom] Error: ", err)
        sendError(w, 500, "Internal Server Error")
        return
    }

    CreateConnectionsRoom(id.String())

    sendOk(w, []byte(id.String()))
}

func GetDraws(w http.ResponseWriter, r *http.Request) {
	roomId := chi.URLParam(r, "roomId")

    ctx := context.Background()

    allDraws, err := storage.Redis.JSONGet(ctx, roomId, "$.draws").Result()

    allDraws = allDraws[1:len(allDraws)-1]

	if err != nil {
        log.Print("[GetDraws] Error: ", err)
        sendError(w, 500, "Internal Server Error")
		return
	}

    sendOk(w, []byte(allDraws))
}

func GetUsers(w http.ResponseWriter, r *http.Request) {
	roomId := chi.URLParam(r, "roomId")

	namesMap := map[string]string{}

	for _, connInfo := range GetConnections(roomId){
		namesMap[connInfo.Name] = connInfo.Color.GetHex()
	}

	jsonStr, err := json.Marshal(namesMap)

	if err != nil {
        log.Print("[GetUsers] Error: ", err)
        sendError(w, 500, "Internal Server Error")
		return
	}

    sendOk(w, jsonStr)
}

func GetLastPositions(w http.ResponseWriter, r *http.Request) {
	roomId := chi.URLParam(r, "roomId")

    ctx := context.Background()

    lastPositions, err := storage.Redis.JSONGet(ctx, roomId, "$.lastPositions").Result()

    lastPositions = lastPositions[1:len(lastPositions)-1]

	if err != nil {
        log.Print("[GetLastPositions] Error: ", err)
        sendError(w, 500, "Internal Server Error")
		return
	}

	sendOk(w, []byte(lastPositions))
}

func GetColor(w http.ResponseWriter, r *http.Request) {
	roomId := chi.URLParam(r, "roomId")

	name := chi.URLParam(r, "user")

	for _, connInfo := range GetConnections(roomId){
		if connInfo.Name == name {
			sendOk(w, []byte(connInfo.Color.GetHex()))
			return
		}
	}

    sendError(w, 404, "User not found")
}
