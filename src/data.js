const default_ = {};

fetch('/memes')
.then(res => res.text())
.then(text => {
    default_.memes = text.split('\n');
});

fetch('/quests')
.then(res => res.text())
.then(text => {
    default_.quests = text.split('\n');
});

export default default_;