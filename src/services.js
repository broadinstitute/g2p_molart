const useCorsForSmr = require('./settings').useCorsForSmr;
const corsServer = require('./settings').corsServer;
const urlPredictProtein = require('./settings').urlPredictProtein;

function ajaxQuery(url, type) {
    if (type === undefined) type = "GET";

    return $.ajax({
        type: type,
        url: url
    });//.then(data => Promise.resolve(data), () => Promise.resolve(undefined));
}

function getFastaByUniprotId(uniprotId) {
    return ajaxQuery('https://rest.uniprot.org/uniprotkb/' + uniprotId + '.fasta');
}

function getUnpToPdbMapping(uniprotId) {
        return ajaxQuery('https://www.ebi.ac.uk/pdbe/api/mappings/best_structures/' + uniprotId);
}

function getObservedRanges(pdbId, chainId) {
    return ajaxQuery(`https://www.ebi.ac.uk/pdbe/api/pdb/entry/polymer_coverage/${pdbId}/chain/${chainId}`);
}


function getUniprotSegments(uniprotId, pdbIds){

    // this is invalid anyway. return ajaxQuery(`https://www.ebi.ac.uk/pdbe/api/mappings/uniprot/${pdbId}`);
    const actualUniprotData = ajaxQuery(`https://www.ebi.ac.uk/pdbe/graph-api/uniprot/unipdb/${uniprotId}`)
        .then(json => {
            const uniprotData = json[uniprotId];
            // Use sequence for validation in the future: const sequence = uniprotData.sequence;
            const data = uniprotData["data"];
            
            const segmentsByPdb = {};

            pdbIds.forEach(pdbId => {
                // find pdbData by looping through data for entry where name is pdbId
                const pdbData = data.find(entry => entry.name === pdbId);
                const segments = pdbData["residues"];

                // filter out segments where observed is "N"
                const observedSegments = segments.filter(segment => segment.observed === "Y");

                // remove duplicates
                const uniqueSegments = observedSegments.filter((segment, index, self) =>
                    index === self.findIndex((t) => (
                        t.startIndex === segment.startIndex && t.endIndex === segment.endIndex
                    ))
                );
                segmentsByPdb[pdbId] = uniqueSegments;
            });

            return segmentsByPdb;
        });
}

function getUnpToSmrMapping(uniprotId) {
  let spUrl = 'https://swissmodel.expasy.org/repository/uniprot/'+uniprotId+'.json?provider=swissmodel'
  if (useCorsForSmr) {
      spUrl = corsServer + 'https://swissmodel.expasy.org/repository/uniprot/'+uniprotId+'.json?provider=swissmodel';
  }

  return ajaxQuery(spUrl).then(function (result) {

    return result.result;
  })
}

function getAfURL(uniprotId) {
    return `https://alphafold.ebi.ac.uk/api/prediction/${uniprotId}`;
}

function getAfCifURL(uniprotId) {
    return `https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-model_v1.cif`;
}




function getUnpToAfMapping(uniprotId) {

    return ajaxQuery(getAfURL(uniprotId));
}

function getPredictProtein(uniprotId) {
    return ajaxQuery(`${urlPredictProtein}${uniprotId}?format=molart`);

}

module.exports = {
    getFastaByUniprotId: getFastaByUniprotId
    , getUnpToPdbMapping: getUnpToPdbMapping
    , getUnpToSmrMapping: getUnpToSmrMapping
    , getUnpToAfMapping: getUnpToAfMapping
    , getPredictProtein: getPredictProtein
    , getObservedRanges: getObservedRanges
    , getUniprotSegments: getUniprotSegments
    , getAfURL: getAfURL
    , getAfCifURL: getAfCifURL
};
