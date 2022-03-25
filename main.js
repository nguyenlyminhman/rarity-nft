const Moralis = require('moralis/node');

const serverUrl = 'https://q5wlvuo8jfmr.usemoralis.com:2053/server';
const appId = 'h4WCOkgutTVd5b2ScEAL5gSCiGOCWdr4GXZKcjxK';

Moralis.start({serverUrl, appId});

const resolveLink = (url) => {
    if (!url || !url.includes("ipfs://")) return url;
    return url.replace("ipfs://", "https://gateway.ipfs.io/ipfs/");
};

const collectionAddress = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D';
const collectionName = 'BoredMonkeyCLub';

async function generatRarity() {
    const NFTs = await Moralis.Web3API.token.getAllTokenIds({address: collectionAddress});
    // console.log('NFTs', NFTs);
    const totalNumber = NFTs.total;
    const pageSize = NFTs.page_size;
    console.log('totalNumber', totalNumber);
    console.log('pageSize', pageSize);
    const allNFTs = NFTs.result;

    // const timer = ts => new Promise(res=> setTimeout(res, ts));

    // for (let index = pageSize; index < totalNumber; index++) {
    //     const NFTs = await Moralis.Web3API.token.getAllTokenIds({address: collectionAddress, offset: index});
    //     allNFTs = allNFTs.concat(NFTs.result);

    //     await timer(600);
    // }

    let metadata = allNFTs.map((e)=> JSON.parse(e.metadata).attributes);

    let tally = {"TraitCount": {}};

    for (let i = 0; i < metadata.length; i++) {
        const nftTraits = metadata[i].map(e => e.trait_type)
        const nftValue = metadata[i].map(e => e.value)
        let noOfTrait = nftTraits.length;
        if(tally.TraitCount[noOfTrait]){
            tally.TraitCount[noOfTrait]++;
        } else {
            tally.TraitCount[noOfTrait] = 1
        }

        for (let i = 0; i < noOfTrait; i++) {
            let current = nftTraits[i];
            if(tally[current]){
                tally[current].occurences++;
            } else {
                tally[current] = {occurences: 1}
            }

            let currentValue = nftValue[i]
            if(tally[current][currentValue]){
                tally[current][currentValue]++;
            } else {
                tally[current][currentValue] = 1;
            }
        }
    }

    

    // console.log(tally);
    let collectionAttribute = Object.keys(tally);
    let nftArr = [];
    for (let j = 0; j < metadata.length; j++) {
        let current = metadata[j];
        let totalRarity = 0;

        for (let i = 0; i < current.length; i++) {
            let rarityScore =
            1 / (tally[current[i].trait_type][current[i].value] / totalNumber);
            current[i].rarityScore = rarityScore;
        }


        let rarityScoreNumTrait = 1 / (tally.TraitCount[Object.keys(current).length] / totalNumber);
       

        current.push({
            trait_type: "TraitCount",
            value: Object.keys(current).length,
            rarityScore: rarityScoreNumTrait
        })

        totalRarity += rarityScoreNumTrait;

        if(current.length < collectionAttribute.length){
            let nftAttribute = current.map((e)=> e.trait_type)

            let absent = collectionAttribute.filter((e)=> !nftAttribute.includes(e));

            absent.forEach((type) => {
                let rarityScoreNull = 1 / ( (totalNumber - tally[type].occurences) / totalNumber);

                current.push({
                    trait_type: type,
                    value: null,
                    rarityScore: rarityScoreNull
                })
            })

        }

        if(allNFTs[j].metadata){
            allNFTs[j].metadata = JSON.parse(allNFTs[j].metadata);
            allNFTs[j].image = resolveLink(allNFTs[j].metadata.image);

        } else if (allNFTs[j].token_uri) {
            try {
                await fetch(allNFTs[j].token_uri)
                    .then((response) => response.json())
                    .then((data) => {
                        allNFTs[j].image = resolveLink(data.image);
                    });
            } catch (error) {
            console.log(error);
            }
        }
// console.log(allNFTs[j]);
        nftArr.push({
            Attributes: current,
            Rarity: totalRarity,
            token_id: allNFTs[j].token_id,
            image: allNFTs[j].image
        })
        // console.log(nftArr);
        
    }
    
    nftArr.sort((a, b) => b.Rarity - a.Rarity);
    for (let i = 0; i < nftArr.length; i++) {
        nftArr[i].Rank = i + 1;
        const newClass = Moralis.Object.extend(collectionName);
        const newObject = new newClass();

        newObject.set("attributes", nftArr[i].Attributes);
        newObject.set("rarity", nftArr[i].Rarity);
        newObject.set("tokenId", nftArr[i].token_id);
        newObject.set("rank", nftArr[i].Rank);
        newObject.set("image", nftArr[i].image);

        await newObject.save();
        console.log(i);
    }
    
}

generatRarity();

