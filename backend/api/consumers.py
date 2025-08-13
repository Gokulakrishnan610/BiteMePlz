from channels.generic.websocket import AsyncJsonWebsocketConsumer


class StockConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.group_name = 'stock_updates'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def stock_update(self, event):
        # event: { 'type': 'stock_update', 'product_id': str, 'stock': int, 'shop_id': str }
        await self.send_json(event)


