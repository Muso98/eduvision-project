import asyncio
import websockets

async def test():
    uri = "ws://127.0.0.1:8000/ws/stream/50/"
    try:
        async with websockets.connect(uri) as websocket:
            print("SUCCESS: Connected to stream WS for lesson 50")
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(test())
