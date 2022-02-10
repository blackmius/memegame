import Peer from 'peerjs';
import { z, Val, body } from './z/z3.9';


// 7
// const angles = [-3.5, -2, -1, 0, 1, 2, 3.5].map(i => i*5);
// const translatesX = [3.5, 2, 1, 0, -1, -2, -3.5].map(i => i*20);
// const translatesY = [0.75, -1, -2, -2.5, -2, -1, 0.75].map(i => i*25);

const angles = [-2, -1, 0, 1, 2].map(i => i*5);
const translatesX = [2, 1, 0, -1, -2].map(i => i*20);
const translatesY = [-1, -2, -2.5, -2, -1].map(i => i*25);

function Board(game) {
    return z(
        z['flex fixed top-10 right-0 left-0 justify-center'](
            z['text-2xl text-center'](game.quest)
        ),
        _=> !game.selected ? z['flex fixed bottom-0 right-0 left-0 justify-center'](
            [1,2,3,4,5].map((i, j) => 
                z[`h-64 bg-white aspect-[2/3] cursor-pointer hover:translate-y-[${translatesY[j]-60}px] translate-y-[${translatesY[j]}px] translate-x-[${translatesX[j]}px] rotate-[${angles[j]}deg] transition hover:overflow-visible hover:z-10 rounded-md drop-shadow overflow-hidden`](
                    {
                        onclick() {
                            game.selectCard(game.cards[j]);
                        }
                    },
                    z.Img['h-full rounded-md max-h-full max-w-none bg-white']({
                        src: game.cards[j],
                        onload(e) {
                            const image = e.target;
                            const aspectRatio = image.naturalWidth / image.naturalHeight;
                            const width = image.parentElement.offsetHeight * aspectRatio;
                            image.classList.add(`-translate-x-[${width/4}px]`)
                        }    
                    })
                )    
            )
        ) : z['flex fixed bottom-0 right-0 left-0 justify-center'](
            z[`h-64`](
                z.Img['h-full rounded-md max-h-full max-w-none bg-white']({
                    src: game.selected,   
                })
            )
        )
    );
}

function Vote(game, p) {
    return z(
        z['flex mt-8 justify-center'](
            z(
                z['text-2xl text-center'](game.quest),
                z['mt-8 text-2xl text-center']('Голосование')
            )
        ),
        _ => game.voted ?
            z['flex mt-8 justify-center flex-wrap items-start'](
                Object.entries(p).map(([k, v]) => z['flex flex-col justify-center items-center m-2'](
                    z['h-64' + (k !== game.voted ? ' opacity-40' : '')](
                        z.Img['h-full rounded-md max-h-full max-w-none bg-white']({
                            src: v.card,  
                        })
                    ),
                    k === game.voted ? z['text-sm text-center']('Вы проголосовали за этот мем') : ''
                ))
            )
        : z['flex mt-8 justify-center flex-wrap'](
            Object.entries(p).map(([k, v]) => z['h-64 m-2'](
                z.Img['h-full rounded-md max-h-full max-w-none bg-white cursor-pointer']({
                    src: v.card,
                    onclick() {
                        game.vote(k);
                    }   
                })
            ))
        )
    );
}

function endGame(game, p) {
    return z(
        z['flex mt-8 justify-center'](
            z(
                z['text-2xl text-center'](game.quest),
                z['mt-8 text-2xl text-center']('Результаты')
            )
        ),
        z['flex mt-8 justify-center flex-wrap'](
            Object.entries(p).map(([k, v]) => z['flex flex-col justify-center items-center m-2'](
                z['h-64'](
                    z.Img['h-full rounded-md max-h-full max-w-none bg-white']({
                        src: v.card  
                    })
                ),
                z['text-sm font-bold'](v.name),
                z['text-sm'](v.votes)
            ))
        ),
        game.isHost ? z.Button['mt-8 py-2 px-3 rounded w-full text-white transition bg-blue-400 hover:bg-blue-500']({
            onclick() {
                game.startGame();
            }
        }, 'Новый раунд') : ''
    );
}

export function getData() {
    return Promise.all([
        fetch('/memes')
            .then(res => res.text())
            .then(text => text.split('\n')),
        fetch('/quests')
            .then(res => res.text())
            .then(text => text.split('\n'))
    ]);
}

function Game(view) {
    const peer = new Peer();
    const players = {};
    this.players = players;

    const self = this;

    const clientMethods = {
        newPlayer(id) {
            players[id] = {};
        },
        deletePlayer(id) {
            delete players[id];
            body.update();
        },
        startGame(q, c) {
            self.quest = q;
            self.cards = c;
            self.selected = false;
            self.voted = false;
            view(Board(self, q, c));
        },
        endGame(p) {
            view(endGame(self, p));
        },
        voteGame(p) {
            view(Vote(self, p));
        },
        setPlayers(pl) {
            Object.assign(players, pl);
            body.update();
        },
        setName(id, name) {
            players[id] ??= {};
            players[id].name = name;
            body.update();
        }
    };

    let send;

    if (document.location.hash) {
        peer.on('open', _ => {
            const conn = peer.connect(document.location.hash.slice(1));
            conn.on('close', console.error);
            conn.on('open', _ => {
                this.connected = true;
                body.update();
            })
            conn.on('data', data => {
                const [fn, ...args] = JSON.parse(data);
                clientMethods[fn](...args);
            })

            send = function(...args) {
                conn.send(JSON.stringify(args));
            }
        });
    } else {
        this.isHost = true;

        peer.on('open', _ => {
            document.location.hash = peer.id;
        })
        
        const serverMethods = {
            vote(conn, id) {
                players[conn.id].voted = true;
                players[id].votes ??= 0;
                players[id].votes++;
                if (Object.values(players).filter(p => p.voted == false).length == 0) {
                    const m = Math.max(Object.values(players).map(p => p.votes));
                    Object.values(players).filter(p => p.votes == m).forEach(p => {
                        p.score ??= 0;
                        p.score++;
                    });
                    broadcast('endGame', players);
                }
            },
            selectCard(conn, card) {
                players[conn.id].card = card;
                if (Object.values(players).filter(p => p.card == null).length == 0) {
                    broadcast('voteGame', players);
                }
            },
            startGame() {
                for (const player of Object.values(players)) {
                    player.voted = 0;
                    player.votes = 0;
                    player.card = null; 
                }
                const quest = data[1][Math.floor(Math.random() * (data[1].length))];
                for (const conn of conns) {
                    conn.s('startGame',
                        quest,
                        Array.from({length: 5}, _ => data[0][Math.floor(Math.random() * (data[0].length))])
                    );
                }
            },
            setName(conn, name) {
                broadcast('setName', conn.id, name);
            }
        };

        let data;
        getData().then(d => data = d);

        const conns = new Set();
        function broadcast(...args) {
            conns.forEach(c => c.send(JSON.stringify(args)));
            const [fn, ..._args] = args;
            clientMethods[fn](..._args);
        }
        peer.on('connection', conn => {
            conn.id = Math.random();
            broadcast('newPlayer', conn.id);
            conn.s = function(...args) {
                conn.send(JSON.stringify(args));
            }
            setTimeout(_ => conn.s('setPlayers', players), 1000);
            conns.add(conn);
            conn.on('data', data => {
                const [fn, ...args] = JSON.parse(data);
                serverMethods[fn](conn, ...args);
            })
            conn.on('close', _ => {
                conns.delete(conn);
                broadcast('deletePlayer', conn.id);
            });
        });

        let con = {
            id: Math.random(),
            send(data) {
                const [fn, ...args] = JSON.parse(data);
                clientMethods[fn](...args);
            },
            s(fn, ...args) {
                clientMethods[fn](...args);
            }
        };
        conns.add(con);
        send = function (fn, ...args) {
            serverMethods[fn](con, ...args);
        }
    }

    this.vote = function(id) {
        this.voted = id;
        send('vote', id);
        body.update();
    }

    this.selectCard = function(card) {
        this.selected = card;
        send('selectCard', card);
        body.update();
    }

    this.startGame = function() {
        send('startGame');
    };

    this.setName = function(name) {
        send('setName', name);
    }
}

export default function() {
    const view = Val();
    const game = new Game(view);
    view(NameInput());

    function NameInput() {
        const name = Val('');
        return z['flex h-full w-full justify-center items-center'](z.v(
            z['text-center text-xl'](
                game.isHost ? 'Начать новую игру' : 'Подключение к комнате'
            ),
            z['mt-8'],
            z.Label['text-sm mb-2']('Введите ваше имя'),
            z.Input['appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none']({
                value: name,
                oninput(e) { name(e.target.value); }
            }),
            z['mt-4'](),
            z['flex justify-center'](
                _ => (game.isHost || game.connected) ? z.Button['py-2 px-3 rounded w-full text-white transition bg-blue-400 hover:bg-blue-500'](
                    {
                        onclick() {
                            game.setName(name());
                            view(GameLobby());
                        }
                    },
                    game.isHost ? 'Создать игру' : 'Подключиться'
                ) : z['py-2 px-3 rounded w-full text-gray-400 transition bg-gray-100 text-center'](
                    'Подключение к владельцу...'
                )
            )
        ))
    }
    
    function GameLobby() {
        return z['flex h-full w-full justify-center items-center'](z.v(
            z['text-center text-xl']('Ожидание других игроков'),
            z['mt-8'],
            z.Label['text-sm mb-2']('Поделитесь этой ссылкой, чтобы пригласить остальных'),
            z['flex appearance-none border rounded w-full text-gray-700 leading-tight items-center'](
                z['text-sm flex-1 px-3'](document.location),
                z.Button['py-2 px-3 rounded-r text-white transition bg-blue-400 hover:bg-blue-500'](
                    'Скопировать'
                )
            ),
            z['mt-4'](),
            _=> z.Label['text-lg mb-2']('Игроки: ', game.players.length),
            z['mt-2'](),
            _ => Object.values(game.players).map((i, j) => z['text-sm mt-1'](j+1+'. ', i.name)),
            z['mt-8'](),
            z['flex justify-center'](
                game.isHost ? z.Button['py-2 px-3 rounded w-full text-white transition bg-blue-400 hover:bg-blue-500']({
                    onclick() {
                        game.startGame();
                    }
                },
                    'Начать игру'
                ) : z['py-2 px-3 rounded w-full text-gray-400 transition bg-gray-100 text-center'](
                    'Ожидайте пока владелец комнаты начнет игру'
                )
            )
        ))
    }

    return view;
}