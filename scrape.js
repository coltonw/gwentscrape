const fs = require("fs");
const Crawler = require("crawler");
const he = require("he");
const nunjucks = require("nunjucks");

const profileDataRegex = /data-state='([^']*)'/;

const decks = [];

function extractMatches($, faction) {
  const raw = $(`.current-ranked .icon--${faction}`)
    .closest("tr")
    .find("td")
    .eq(1)
    .text();
  return parseInt(raw.trim().replace(",", ""), 10);
}

function extractMmr($) {
  const raw = $(`.current-ranked .icon--gwent`)
    .closest("tr")
    .find("td strong")
    .eq(1)
    .text();
  return parseInt(raw.trim().replace(",", ""), 10);
}

const profileCrawler = new Crawler({
  maxConnections: 10,
  // This will be called for each crawled page
  callback: function (err, res, done) {
    if (err) {
      console.log(err);
    } else {
      try {
        // $ is Cheerio (jquery-lite)
        var $ = res.$;
        const matches = {
          mon: extractMatches($, "monsters"),
          ske: extractMatches($, "skellige"),
          syn: extractMatches($, "syndicate"),
          sco: extractMatches($, "scoiatael"),
          nil: extractMatches($, "nilfgaard"),
          nor: extractMatches($, "northernrealms"),
          // overall:
          // rank:
        };
        const mmr = extractMmr($);
        const profileData = profileDataRegex.exec(res.body);
        const { guides } = JSON.parse(he.decode(profileData[1]));
        guides.forEach((guide) => {
          if (!guide.invalid) {
            console.log(
              `${guide.faction.short} https://www.playgwent.com/en/decks/guides/${guide.id}`
            );
            guide.mmr = mmr;
            guide.matches = matches[guide.faction.short];
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
  },
});

// profileCrawler.queue('https://www.playgwent.com/en/profile/Redrame');

var rankCrawler = new Crawler({
  maxConnections: 10,
  callback: function (err, res, done) {
    if (err) {
      console.log(err);
    } else {
      // $ is Cheerio (jquery-lite)
      var $ = res.$;
      $(".c-ranking-table--pro .td-nick strong").each((_, el) => {
        const nickname = $(el).text();
        profileCrawler.queue(
          `https://www.playgwent.com/en/profile/${encodeURI(nickname)}`
        );
      });
    }
    done();
  },
});

const season = "season-of-the-elf";
const pages = 10;
for (let i = 1; i <= pages; i++) {
  const pageText = i > 1 ? `/${i}` : "";
  rankCrawler.queue(
    `https://masters.playgwent.com/en/rankings/masters-2/${season}/1${pageText}`
  );
}

rankCrawler.on("drain", () => {
  profileCrawler.on("drain", () => {
    const htmlResult = nunjucks.render("table.html.njk", { decks });
    fs.writeFileSync("table.html", htmlResult);
  });
});
