const fs = require('fs');
const Crawler = require("crawler");
const he = require('he');
const nunjucks = require('nunjucks');

const profileDataRegex = /data-state='([^']*)'/;

const decks = [];

function extractFMMR($, faction) {
    const raw = $(`.current-ranked .icon--${faction}`)
        .closest('tr').find('td').eq(1).text();
    return parseInt(raw.trim().replace(',', ''), 10);
}

const profileCrawler = new Crawler({
    maxConnections : 10,
    // This will be called for each crawled page
    callback : function (err, res, done) {
        if (err) {
            console.log(err);
        } else {
            try {
                // $ is Cheerio (jquery-lite)
                var $ = res.$;
                const fMMR = {
                    mon: extractFMMR($, 'monsters'),
                    ske: extractFMMR($, 'skellige'),
                    syn: extractFMMR($, 'syndicate'),
                    sco: extractFMMR($, 'scoiatael'),
                    nil: extractFMMR($, 'nilfgaard'),
                    nor: extractFMMR($, 'northernrealms'),
                    // overall:
                    // rank:
                };
                const profileData = profileDataRegex.exec(res.body);
                const { guides } = JSON.parse(he.decode(profileData[1]));
                guides.forEach((guide) => {
                    if (!guide.invalid) {
                        console.log(`${guide.faction.short} https://www.playgwent.com/en/decks/guides/${guide.id}`);
                        guide.fMMR = fMMR[guide.faction.short];
                        decks.push(guide);
                    }
                });
            } catch (e) {
                // This can happen if the profile is hidden
                // const path = res.request.uri.pathname.split('/');
                // const nickname = path[path.length - 1];
                // console.log(`Failed to get profile for ${nickname}`)
                // console.log(e);
            }
        }
        done();
    }
});

// profileCrawler.queue('https://www.playgwent.com/en/profile/Redrame');

var rankCrawler = new Crawler({
    maxConnections : 10,
    callback : function (err, res, done) {
        if (err) {
            console.log(err);
        } else {
            // $ is Cheerio (jquery-lite)
            var $ = res.$;
            $(".on-desktop .td-nick strong").each((_, el) => {
                const nickname = $(el).text();
                profileCrawler.queue(`https://www.playgwent.com/en/profile/${nickname}`);
            });
        }
        done();
    }
});

rankCrawler.queue('https://masters.playgwent.com/en/rankings/pro-rank/season-14');
rankCrawler.queue('https://masters.playgwent.com/en/rankings/pro-rank/season-14/2');
rankCrawler.queue('https://masters.playgwent.com/en/rankings/pro-rank/season-14/3');
rankCrawler.queue('https://masters.playgwent.com/en/rankings/pro-rank/season-14/4');
rankCrawler.queue('https://masters.playgwent.com/en/rankings/pro-rank/season-14/5');
rankCrawler.queue('https://masters.playgwent.com/en/rankings/pro-rank/season-14/6');
rankCrawler.queue('https://masters.playgwent.com/en/rankings/pro-rank/season-14/7');
rankCrawler.queue('https://masters.playgwent.com/en/rankings/pro-rank/season-14/8');
rankCrawler.queue('https://masters.playgwent.com/en/rankings/pro-rank/season-14/9');
rankCrawler.queue('https://masters.playgwent.com/en/rankings/pro-rank/season-14/10');

rankCrawler.on('drain', () => {
    profileCrawler.on('drain', () => {
        const htmlResult = nunjucks.render('table.html.njk', { decks });
        fs.writeFileSync('table.html', htmlResult);
    });
});
