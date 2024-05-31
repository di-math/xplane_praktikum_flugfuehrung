import spc
import json
import asyncio
import websockets

PORT = 3000
clients = set()


async def connection_callback(websocket):
    clients.add(websocket)
    try:
        async for msg in websocket:
            print(msg)
    except Exception as e:
        print(e)
    finally:
        clients.remove(websocket)


async def send_pos():
    with spc.FlightController() as fc:
        while True:
            if clients:
                pos = fc.xpc.getPOSI()
                height = fc.get_altitude_ft_pilot()
                await asyncio.gather(*[client.send(json.dumps({"lat": pos[1], "lon": pos[0], "heading": pos[5], "height": height})) for client in clients])
            await asyncio.sleep(1)


async def main():
    async with websockets.serve(connection_callback, "localhost", 3000):
        await asyncio.gather(send_pos())


if __name__ == "__main__":
    asyncio.run(main())
