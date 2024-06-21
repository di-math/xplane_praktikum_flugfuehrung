import spc
import json
import asyncio
import websockets

PORT = 8080
clients = set()


async def connection_callback(websocket):
    clients.add(websocket)
    try:
        async for msg in websocket:
            print(msg)
            with spc.FlightController() as fc:
                data = json.loads(msg)
                if(data["command"] == "set_ap"):
                    fc.set_ap_heading_select_engage(data["active"])
                if(data["command"] == "set_heading"):
                    fc.set_ap_heading(data["heading"])
    except Exception as e:
        print(e)
    finally:
        clients.remove(websocket)


async def send_pos():
    with spc.FlightController() as fc:
        while True:
            if clients:
                pos = fc.xpc.getPOSI()
                tailnumber = fc.get_tailnumber()
                transponder_code = fc.get_transponder_code()
                await asyncio.gather(*[client.send(json.dumps({"lat": pos[0], "lon": pos[1], "heading": pos[5], "aoa": pos[3], "height": pos[2], "transponder_code": transponder_code, "tailnumber": tailnumber})) for client in clients])
            await asyncio.sleep(0.25)


async def main():
    async with websockets.serve(connection_callback, "localhost", PORT):
        await asyncio.gather(send_pos())


if __name__ == "__main__":
    asyncio.run(main())
