import spc
from time import sleep
import socket


def main():
    with spc.FlightController() as fc:
        # Create a socket
        server_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        server_socket.bind(8080)
        # Listen for connection
        server_socket.listen(1)
        client_socket, _ = server_socket.accept()
        print("Connection accepted.")

        while True:
            pos = fc.xpc.getPOSI()
            print(pos)

            sleep(1)



if __name__ == "__main__":
    main()
