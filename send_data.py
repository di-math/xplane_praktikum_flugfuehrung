import spc
import json
import asyncio
import websockets

PORT = 3000
clients = set()


async def connection_callback(websocket):
    clients.add(websocket)
    async for msg in websocket:
        print(msg)


async def send_pos():
    with spc.FlightController() as fc:
        while True:
            if clients:
                pos = fc.xpc.getPOSI()
                await asyncio.gather(*[client.send(json.dumps({"lat": pos[1], "lon": pos[0], "heading": pos[5]})) for client in clients])
            await asyncio.sleep(1)


async def main():
    async with websockets.serve(connection_callback, "localhost", 3000):
        await asyncio.gather(send_pos())


if __name__ == "__main__":
    asyncio.run(main())
