package api

import (
	"brush/storage"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
)

func ok(w http.ResponseWriter, data []byte) {
    w.WriteHeader(200)
    w.Write(data)
}

func error(w http.ResponseWriter, code int, message string) {
    w.WriteHeader(code)
    w.Write([]byte(fmt.Sprintf("{message: \"%s\"}", message)))
}

func GetDraws(w http.ResponseWriter, r *http.Request) {
    ctx := context.Background()

    allDraws, err := storage.Redis.JSONGet(ctx, "draws", "$").Result()

    allDraws = allDraws[1:len(allDraws)-1]

	if err != nil {
        log.Print("[GetDraws] Error: ", err)
        error(w, 500, "Internal Server Error")
		return
	}

    ok(w, []byte(allDraws))
}

func GetUsers(w http.ResponseWriter, r *http.Request) {
	namesMap := map[string]string{}

	for _, connInfo := range GetConnections(){
		namesMap[connInfo.Name] = connInfo.Color.GetHex()
	}

	jsonStr, err := json.Marshal(namesMap)

	if err != nil {
        log.Print("[GetUsers] Error: ", err)
        error(w, 500, "Internal Server Error")
		return
	}

    ok(w, jsonStr)
}

func GetLastPositions(w http.ResponseWriter, r *http.Request) {
    ctx := context.Background()

    lastPositions, err := storage.Redis.JSONGet(ctx, "lastPositions", "$").Result()

    lastPositions = lastPositions[1:len(lastPositions)-1]

	if err != nil {
        log.Print("[GetLastPositions] Error: ", err)
        error(w, 500, "Internal Server Error")
		return
	}

	ok(w, []byte(lastPositions))
}

func GetColor(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "user")

	for _, connInfo := range GetConnections(){
		if connInfo.Name == name {
			ok(w, []byte(connInfo.Color.GetHex()))
			return
		}
	}

    error(w, 404, "User not found")
}
