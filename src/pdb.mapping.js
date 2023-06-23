const _ = require('lodash');

const useCorsForSmr = require('./settings').useCorsForSmr;
const corsServer = require('./settings').corsServer;

const STRUCTURE_FORMAT = {
    PDB: 0,
    mmCIF: 1
};

class PDBRangePoint {
    constructor(data){
        this.posPDBStructure = data.author_residue_number; //number of the residue in the PDB structure
        this.insertionCode = data.author_insertion_code;
        this.posPDBSequence = data.residue_number; // number of the residue in the PDB sequence
    }
}

class ObservedRange {
    constructor(data){
        this.start = new PDBRangePoint(data.start);
        this.end = new PDBRangePoint(data.end);
    }
}

class UnobservedRange {
    constructor(start, end){
        this.start = start;
        this.end = end;
    }
}

/**
 * Contains rages of residues which are isnerted with respect to the PDB record. I.e. ranges of residues
 * which are not observed in the UniProt record.
 */
class UniprotRange {
    constructor(data){
        this.unpStart = data.unp_start;
        this.pdbStart = data.start;
        this.unpEnd = data.unp_end;
        this.pdbEnd = data.end;
    }
}

const pdbMapping = function (record, _source = 'PDB') {

    let pdbId = undefined,
        chain = undefined,
        format = undefined,
        uniprotDescription = undefined,
        experimentalMethod = undefined,
        coverage = undefined,
        pdbStart = undefined,
        pdbEnd = undefined,
        uniprotStart = undefined,
        uniprotEnd = undefined,
        taxId = undefined,
        source = _source,
        coordinatesFile = undefined;
    if (source === 'PDB') {
        pdbId = record.pdb_id;
        chain = record.chain_id;
        format = STRUCTURE_FORMAT.mmCIF;
        experimentalMethod = record.experimental_method;
        coverage = record.coverage;
        pdbStart = parseInt(record.start);
        pdbEnd = parseInt(record.end);
        uniprotStart = parseInt(record.unp_start);
        uniprotEnd = parseInt(record.unp_end);
        coordinatesFile = 'https://www.ebi.ac.uk/pdbe/static/entry/' + pdbId + '_updated.cif';
        taxId = record.tax_id;
    } else if (source === 'SMR') {//swissprot model repository
        const sTemplate = record.template.match(/(.+)\.(.+)+\.(.+)/);
        pdbId = sTemplate[1] + '.' + sTemplate[2];
        chain = sTemplate[3];
        format = STRUCTURE_FORMAT.PDB;
        experimentalMethod = `${record.provider} (${record.method})`;
        coverage = record.coverage;
        pdbStart = parseInt(record.from);
        pdbEnd = parseInt(record.to);
        uniprotStart = parseInt(record.from);
        uniprotEnd = parseInt(record.to);
        coordinatesFile = record.coordinates;
        if (useCorsForSmr) coordinatesFile = corsServer + coordinatesFile
    } else if (source === 'AF') {//alphafold DB
        /*
            [
              {
                "entryId": "AF-Q5VSL9-F1",
                "gene": "STRIP1",
                "uniprotAccession": "Q5VSL9",
                "uniprotId": "STRP1_HUMAN",
                "uniprotDescription": "Striatin-interacting protein 1",
                "taxId": 9606,
                "organismScientificName": "Homo sapiens",
                "uniprotStart": 1,
                "uniprotEnd": 837,
                "uniprotSequence": "MEPAVGGPGPLIVNNKQPQPPPPPPPAAAQPPPGAPRAAAGLLPGGKAREFNRNQRKDSEGYSESPDLEFEYADTDKWAAELSELYSYTEGPEFLMNRKCFEEDFRIHVTDKKWTELDTNQHRTHAMRLLDGLEVTAREKRLKVARAILYVAQGTFGECSSEAEVQSWMRYNIFLLLEVGTFNALVELLNMEIDNSAACSSAVRKPAISLADSTDLRVLLNIMYLIVETVHQECEGDKAEWRTMRQTFRAELGSPLYNNEPFAIMLFGMVTKFCSGHAPHFPMKKVLLLLWKTVLCTLGGFEELQSMKAEKRSILGLPPLPEDSIKVIRNMRAASPPASASDLIEQQQKRGRREHKALIKQDNLDAFNERDPYKADDSREEEEENDDDNSLEGETFPLERDEVMPPPLQHPQTDRLTCPKGLPWAPKVREKDIEMFLESSRSKFIGYTLGSDTNTVVGLPRPIHESIKTLKQHKYTSIAEVQAQMEEEYLRSPLSGGEEEVEQVPAETLYQGLLPSLPQYMIALLKILLAAAPTSKAKTDSINILADVLPEEMPTTVLQSMKLGVDVNRHKEVIVKAISAVLLLLLKHFKLNHVYQFEYMAQHLVFANCIPLILKFFNQNIMSYITAKNSISVLDYPHCVVHELPELTAESLEAGDSNQFCWRNLFSCINLLRILNKLTKWKHSRTMMLVVFKSAPILKRALKVKQAMMQLYVLKLLKVQTKYLGRQWRKSNMKTMSAIYQKVRHRLNDDWAYGNDLDARPWDFQAEECALRANIERFNARRYDRAHSNPDFLPVDNCLQSVLGQRVDLPEDFQMNYDLWLEREVFSKPISWEELLQ",
                "modelCreatedDate": "2021-07-01",
                "latestVersion": 1,
                "allVersions": [
                  1
                ],
                "cifUrl": "https://alphafold.ebi.ac.uk/files/AF-Q5VSL9-F1-model_v1.cif",
                "bcifUrl": "https://alphafold.ebi.ac.uk/files/AF-Q5VSL9-F1-model_v1.bcif",
                "pdbUrl": "https://alphafold.ebi.ac.uk/files/AF-Q5VSL9-F1-model_v1.pdb",
                "paeImageUrl": "https://alphafold.ebi.ac.uk/files/AF-Q5VSL9-F1-predicted_aligned_error_v1.png",
                "paeDocUrl": "https://alphafold.ebi.ac.uk/files/AF-Q5VSL9-F1-predicted_aligned_error_v1.json"
              }
            ]
             */
        pdbId = record.entryId;
        chain = 'A'; //The AF structures seem to be single-chain structures where the assymetric unit ID is A
        format = STRUCTURE_FORMAT.mmCIF;
        uniprotDescription = record.uniprotDescription,
        pdbStart = parseInt(record.uniprotStart);
        pdbEnd = parseInt(record.uniprotEnd);
        uniprotStart = parseInt(record.uniprotStart);
        uniprotEnd = parseInt(record.uniprotEnd);
        coordinatesFile = record.cifUrl;
    }
    else if (source === 'USER'){
        pdbId = record.id;
        chain = record.chainId;
        format = record.structure.format.toUpperCase() === 'PDB' ? STRUCTURE_FORMAT.PDB : STRUCTURE_FORMAT.mmCIF;
        experimentalMethod = 'unknown';
        coverage = (parseInt(record.end) - parseInt(record.start)) / (parseInt(record.seqEnd) - parseInt(record.seqStart));
        pdbStart = parseInt(record.start);
        pdbEnd = parseInt(record.end);
        uniprotStart = parseInt(record.seqStart);
        uniprotEnd = parseInt(record.seqEnd);
        if (record.structure.uri !== undefined){
            coordinatesFile = record.structure.uri;
        } else if (record.structure.data !== undefined){
            coordinatesFile = 'data:text/plain;base64,' + btoa(record.structure.data)
        } else {
            throw Error('Structure information parameter requires information about uri or data.')
        }
    }
    else {
        throw Error('Unknown source of PDB mapping data');
    }

    let observedResidues = [];

    let observedRanges = [shiftObservedRangeToFitMapping(new ObservedRange({
        start: {
            author_residue_number: pdbStart,
            author_insertion_code: undefined,
            residue_number: 1
        },
        end: {
            author_residue_number: pdbEnd,
            author_insertion_code: undefined,
            residue_number: uniprotEnd-uniprotStart
        }
    }))];
    let unobservedRanges = [];

    let uniprotRanges = [];

    const getId = function(){return getPdbId() + getChainId();};
    const getPdbId = function(){return pdbId;};
    const getChainId = function(){return chain;};
    const getFormat = function () {return format;};
    const getExperimentalMethod = function(){return experimentalMethod;};
    const getUniprotDescription = function(){return uniprotDescription;};
    const getCoverage = function(){return coverage;};
    const getLength = function () {return getUnpEnd() - getUnpStart();};
    const getPdbStart = function(){return pdbStart;};
    const getPdbEnd = function(){return pdbEnd;};
    const getUnpStart = function(){return uniprotStart;};
    const getUnpEnd = function(){return uniprotEnd;};
    const getTaxId = function(){return taxId;};
    const getObservedResidues = function(){return observedResidues;};
    const getObservedRanges = function(){return observedRanges;};
    const getUnobservedRanges = function(){return unobservedRanges;};
    const getSource = function(){return source};
    const getCoordinatesFile = function () {return coordinatesFile; }
    const isPDB = function () {
        return getSource() === 'PDB';
    };

    const getSeqRangeFromObservedRange = function (range) {
        return [
            Math.max(this.getUnpStart(), this.mapPosStructToUnp(range.start.posPDBSequence)),
            Math.min(this.mapPosStructToUnp(range.end.posPDBSequence), this.getUnpEnd())
            ];
    }

    const setUnobservedRanges = function(){
        const ors = getObservedRanges().sort( (a,b) => a.start.posPDBSequence - b.start.posPDBSequence);
        if (ors.length === 0) {
            console.warn(`Structure ${pdbId}:${chain} has no observed range in the mapped region.`);
            return;
        }
        unobservedRanges = [];

        if (1 < ors[0].start.posPDBSequence){
            unobservedRanges.push(new UnobservedRange(1, ors[0].start.posPDBSequence-1));
        }

        for (let i = 1; i < ors.length; i++) {
            unobservedRanges.push(new UnobservedRange(ors[i-1].end.posPDBSequence+1, ors[i].start.posPDBSequence-1))
        }

        if (getLength()  >= ors[ors.length - 1].end.posPDBSequence){ //+1 because length
            unobservedRanges.push(new UnobservedRange(ors[ors.length - 1].end.posPDBSequence+1, getLength()+1));
        }
    };

    const setTaxId = function (tId) {taxId = tId};

    const setObservedResidues = function(or){observedResidues = or};

    function shiftObservedRangeToFitMapping(or) {
        /*
        The observed ranges API endpoint does not need to match the best_structures API and thus range which starts
        at position 1 can actually start before the beginning of the mapped region. This is, e.g. the case of 2dnc,
        where observed range is
        "observed": [
              {
                "start": {
                  "author_residue_number": 1,
                  "author_insertion_code": null,
                  "struct_asym_id": "A",
                  "residue_number": 1
                },
                "end": {
                  "author_residue_number": 98,
                  "author_insertion_code": null,
                  "struct_asym_id": "A",
                  "residue_number": 98
                }
              }
            ],
           and best mapping is
           {
              "end": 92,
              "chain_id": "A",
              "pdb_id": "2dnc",
              "start": 8,
              "unp_end": 141,
              "coverage": 0.17,
              "unp_start": 57,
              "resolution": null,
              "experimental_method": "Solution NMR",
              "tax_id": 9606
            }
           Thus the mapping actually does not cover the full available structure.
         */

        const orc = _.cloneDeep(or);
        if (source === 'SMR'){
            orc.end.posPDBSequence +=1;
        } else {
            orc.start.posPDBSequence -= pdbStart - 1;
            orc.end.posPDBSequence -= pdbStart - 1;
        }

        return orc;

    }

    const setObservedRanges = function(ors){
        observedRanges = ors.filter(or => {
            // return true;
            return or.start.posPDBSequence <= pdbEnd && or.end.posPDBSequence >= pdbStart;
        }).map(or => shiftObservedRangeToFitMapping(or));
        setUnobservedRanges();
    };

    const parseUniprotRanges = function (json, uniprotId) {
        /*** Only the mappings part of the following JSON is passed to the function
         * {
  "6i53": {
    "UniProt": {
      "P14867": {
        "identifier": "GBRA1_HUMAN",
        "name": "GBRA1_HUMAN",
        "mappings": [
          {
            "entity_id": 2,
            "chain_id": "A",
            "start": {
              "author_residue_number": null,
              "author_insertion_code": "",
              "residue_number": 1
            },
            "unp_end": 27,
            "unp_start": 1,
            "end": {
              "author_residue_number": null,
              "author_insertion_code": "",
              "residue_number": 27
            },
            "struct_asym_id": "B"
          },
          {
            "entity_id": 2,
            "chain_id": "A",
            "start": {
              "author_residue_number": null,
              "author_insertion_code": "",
              "residue_number": 36
            },
            "unp_end": 456,
            "unp_start": 28,
            "end": {
              "author_residue_number": null,
              "author_insertion_code": "",
              "residue_number": 464
            },
            "struct_asym_id": "B"
          },
          ...}
         * @type {*[]}
         */
        let pdbId = Object.keys(json)[0];
        console.log("this happens tooo", json[pdbId]["UniProt"][uniprotId]["mappings"])
        uniprotRanges = json[pdbId]["UniProt"][uniprotId]["mappings"]
            .filter(m => m["chain_id"].toUpperCase() === getChainId().toUpperCase())
            .map(m => new UniprotRange(m))
    }

    const getUniprotRanges = function () {
        return uniprotRanges;
    }

    const notInUniprotRange = function (pos) {
        console.log("uniprot ranges", getUniprotRanges());
        for (let r of getUniprotRanges()) {
            if (r.start <= pos && pos <= r.end)
                return false;
        }
        return true;
    }

    const getSkippedUniprotLength = function (pos) {
        // find length that's been skipped so far
        let cntSkipped = 0;
        let endOfLastUniProtRange = 0;
        for (let r of getUniprotRanges()) {
            if (r.start > pos)
                break;
            if (r.start < pos) {
                cntSkipped += r.start - endOfLastUniProtRange;
                endOfLastUniProtRange = r.end;
                //console.log(`cntSkipped: ${cntSkipped}, endOfLastUniProtRange: ${endOfLastUniProtRange}, range: ${r.start}-${r.end}`)
            }
        }
        return cntSkipped;
    }

    const cntStructureInsertedPosBefore = function (pos) {
        let cntInserted = 0;
        let prev = null;
        for (let r of getUniprotRanges()) {
            if (r.start > pos)
                break;
            if (prev) {
                cntInserted += parseInt(r.pdbStart.residue_number) - parseInt(prev.pdbEnd.residue_number) - 1;
            }
            prev = r;
        }
        return cntInserted
    }

    const mapPosUnpToPdb = function(pos) {
        /** 
         * What's going on is that MolArt has a hacky technique for coloring residues in LiteMol
         * As a result, the residue numbering coming from MolArt has to be sequential, so MolArt
         * has to account for gaps.
         * 
         * Fix required here is that MolArt only accounts for start and end, not for internal gaps.
         */
        // if in gap, return -1
        const intPos = parseInt(pos);
        if (notInUniprotRange(intPos)) {
            return -1;
        }

        console.log(`pos: ${pos}, unpStart: ${getUnpStart()}, pdbStart: ${getPdbStart()}, cnt: ${cntStructureInsertedPosBefore(pos)}`);
        return getPdbStart() + intPos - getSkippedUniprotLength(intPos);
        return getPdbStart() + parseInt(pos) + cntStructureInsertedPosBefore(pos) - getUnpStart();
    };

    const mapPosPdbToUnp = function(pos) {
        return getUnpStart() + parseInt(pos) - cntStructureInsertedPosBefore(pos) - getPdbStart();
    };

    const isInObservedRanges = function (pos) {
        let ors = getObservedRanges();
        for (let i = 0; i< ors.length; ++i){
            let or = ors[i];
            if (pos >= mapPosStructToUnp(or.start.posPDBSequence) && pos <= mapPosStructToUnp(or.end.posPDBSequence)) {
                return true;
            }
        }
        return false;
    };

    const isValidPdbPos = function(pos) {
        return getPdbStart() <= pos && pos <= getPdbEnd();
    };

    const mapPosStructToUnp = function (pos) {
        return getUnpStart() + pos - 1 - cntStructureInsertedPosBefore(pos);
    };

    const isValidPdbRegion = function(begin, end) {

        return ( getPdbStart() <= begin  && begin <= getPdbEnd() )
            || ( getPdbStart() <= end && end <= getPdbEnd()
            || ( begin <= getPdbStart() && getPdbEnd()  <= end )
                );
    };

    const idMatch = function(pdbId, chainId){
        return getPdbId().toLowerCase() === pdbId.toLowerCase() && getChainId().toLowerCase() === chainId.toLowerCase();
    };

    const getDescription = function(){
        return uniprotDescription ? getUniprotDescription() : `Experimental method: ${getExperimentalMethod()}`;
    };



    return  {
        getId: getId
        ,getPdbId: getPdbId
        ,getChainId: getChainId
        ,getFormat: getFormat
        ,getUniprotDescription: getUniprotDescription
        ,getExperimentalMethod: getExperimentalMethod
        ,getCoverage: getCoverage
        ,getLength: getLength
        ,getPdbStart: getPdbStart
        ,getPdbEnd: getPdbEnd
        ,getUnpStart: getUnpStart
        ,getUnpEnd: getUnpEnd
        ,mapPosUnpToPdb: mapPosUnpToPdb
        ,mapPosPdbToUnp: mapPosPdbToUnp
        ,mapPosStructToUnp: mapPosStructToUnp
        ,getTaxId: getTaxId
        ,getSource: getSource
        ,getCoordinatesFile: getCoordinatesFile
        ,getDescription: getDescription
        ,getObservedResidues: getObservedResidues
        ,setObservedResidues: setObservedResidues
        ,getObservedRanges: getObservedRanges
        ,setObservedRanges: setObservedRanges
        ,getInsertedRanges: getUniprotRanges
        ,parseInsertedRanges: parseUniprotRanges
        ,getUnobservedRanges: getUnobservedRanges
        ,getSeqRangeFromObservedRange: getSeqRangeFromObservedRange
        ,setTaxId: setTaxId
        ,isValidPdbPos: isValidPdbPos
        ,isValidPdbRegion: isValidPdbRegion
        ,isInObservedRanges: isInObservedRanges
        ,idMatch: idMatch
        ,isPDB: isPDB
        ,content: {
            id: getId(),
            pdbId: getPdbId(),
            chainId: getChainId(),
            format: getFormat(),
            description: getDescription(),
            experimentalMethod: getExperimentalMethod(),
            coverage: getCoverage(),
            pdbStart: getPdbStart(),
            podbEnd: getPdbEnd(),
            unpStart: getUnpStart(),
            unpEnd: getUnpEnd(),
            taxId: getTaxId(),
            source: getSource(),
            observedResidues: getObservedResidues(),
            observedRanges: getObservedRanges(),
            unobservedRanges: getUnobservedRanges()
        }
    }
};

module.exports = {
    pdbMapping: pdbMapping,
    ObservedRange: ObservedRange,
    STRUCTURE_FORMAT: STRUCTURE_FORMAT
};
