import './tailwindcss.js';

import { body, Val, z } from './z/z3.9.js';
import data from './data.js';

const app = z(
    _=>z['flex fixed bottom-0 right-0 left-0 justify-center'](
        [1,2,3,4,5,6,7].map(i => 
            z['h-64 aspect-[2/3] cursor-pointer hover:-translate-y-12 transition hover:overflow-visible hover:z-10 rounded-md drop-shadow overflow-hidden'](z.Img['h-full rounded-md max-h-full max-w-none']({
                src: data?.memes?.[Math.floor(Math.random() * (data?.memes?.length))],
                onload(e) {
                    const image = e.target;
                    const aspectRatio = image.naturalWidth / image.naturalHeight;
                    const width = image.parentElement.offsetHeight * aspectRatio;
                    image.classList.add(`hover:-translate-x-[${width/4}px]`)
                }    
            }))    
        )
    ),
    z.Button({
        onclick() {
            body.update();
        }
    }, 'Обновить')
)
    
body(app);
