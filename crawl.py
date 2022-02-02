import asyncio
import aiohttp

from bs4 import BeautifulSoup


async def fetch(session, url):
    async with session.get(url) as response:
        if response.status != 200:
            response.raise_for_status()
        text = await response.text()
        soup = BeautifulSoup(text, 'html.parser')
        for i in soup.find(class_='site-main').find_all('img'):
            print(i['src'])
        


async def memepedia():
    async with aiohttp.ClientSession() as session:
        for i in range(1, 126):
            await fetch(session, f'https://memepedia.ru/memoteka/page/{i}/')
            await asyncio.sleep(0.5)

if __name__ == '__main__':
    asyncio.run(memepedia())
