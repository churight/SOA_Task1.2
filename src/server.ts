import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import * as soap from "soap";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const isbnServiceUrl = "http://webservices.daehosting.com/services/isbnservice.wso?WSDL";
const countryInfoWsdl = "http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL";
//const currencyConverterWsdl = "https://www.xignite.com/xCurrencies.asmx?WSDL";

const numberConversionWsdl = "http://www.dataaccess.com/webservicesserver/numberconversion.wso?WSDL";


async function validateISBN(isbn: string) {
    const client = await soap.createClientAsync(isbnServiceUrl);

    if (isbn.length === 10) {
        const [res10] = await client.IsValidISBN10Async({ sISBN: isbn });
        return res10.IsValidISBN10Result === true;
    } else if (isbn.length === 13) {
        const [res13] = await client.IsValidISBN13Async({ sISBN: isbn });
        return res13.IsValidISBN13Result === true;
    } else {
        return false;
    }
}

/*async function getBookData(isbn: string) {
    try {
        const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`;
        const res = await fetch(url);
        const data = await res.json();

        const book = data[`ISBN:${isbn}`];
        if (!book) return { title: "Unknown", authors: "Unknown", publishCountry: "Unknown" };

        return {
            title: book.title,
            authors: book.authors?.map((a: any) => a.name).join(", ") || "Unknown",
            publishCountry: book.publish_places?.[0]?.name || "Unknown"
        };
    } catch (err) {
        console.error("Error fetching book data:", err);
        return { title: "Unknown", authors: "Unknown", publishCountry: "Unknown" };
    }
}*/

async function getCountryCurrency(countryCode: string){
    const client = await soap.createClientAsync(countryInfoWsdl);
    const [response] = await client.CountryCurrencyAsync({sCountryISOCode: countryCode});
    return response && response.CountryCurrencyResult ? response.CountryCurrencyResult.sISOCode : null
}

/*async function convertCurrency(from: string, to: string, amount: number){
    try {
        const client = await soap.createClientAsync(currencyConverterWsdl);

        const [response] = await client.ConvertRealTimeValueAsync({
            From: from,
            To: to, 
            Amount: amount,
            //_Token: "YOUR_XIGNITE_TOKEN"
        });

        console.log("Full SOAP response:", JSON.stringify(response, null, 2));

        const result = response?.ConvertRealTimeValueResult;
        if (!result) return null;

        console.log("Parsed result:", result);

        return result.Amount ?? null;
    } catch (err) {
        console.error("SOAP error:", err);
        return null;
    }
}*/

async function convertNumberToWords(amount: number) {
    try {
        const client = await soap.createClientAsync(numberConversionWsdl);
        const [response] = await client.NumberToWordsAsync({ ubiNum: amount });
        return response?.NumberToWordsResult ?? null;
    } catch (err) {
        console.error("NumberConversion SOAP error:", err);
        return null;
    }
}

async function convertNumberToDollars(amount: number) {
    try {
        const client = await soap.createClientAsync(numberConversionWsdl);
        const [response] = await client.NumberToDollarsAsync({ dNum: amount });
        return response?.NumberToDollarsResult ?? null;
    } catch (err) {
        console.error("NumberConversion SOAP error:", err);
        return null;
    }
}


app.post("/api/check-books", async (req, res) => {
    /*const { isbns } = req.body;
    let isbnArray: string[] = [];

    if (typeof isbns === "string") {
        isbnArray = isbns.split(",").map((s) => s.trim());
    } else if (Array.isArray(isbns)) {
        isbnArray = isbns;
    } else {
        return res.status(400).json({ error: "isbns must be an array or comma-separated string" });
    }

    const results: any[] = [];

    for (const isbn of isbnArray) {
        try {
            const valid = await validateISBN(isbn);
            results.push({ isbn, valid });
        } catch (err) {
            console.error("Error validating ISBN:", err);
            results.push({ isbn, valid: false, error: "Validation failed" });
        }
    }

    res.json(results);*/

    const {books} = req.body;

    if(!Array.isArray(books)){
        return res.status(400).json({error: "books r not an array"});
    }

    const results: any[] =[];

    for(const book of books){
        try{
            const {isbn, price, countryCode} = book;
            const valid = await validateISBN(isbn);

            if (!valid) {
                results.push({ isbn, valid: false, error: "Invalid ISBN" });
                continue;
            }

            const currency = await getCountryCurrency(countryCode);
            if (!currency) {
                results.push({ isbn, valid: true, error: "Could not fetch currency" });
                continue;
            }

            /*let convertedPrice: number | null = null;
            if (targetCurrency && currency !== targetCurrency) {
                convertedPrice = await convertCurrency(currency, targetCurrency, price);
            }*/

            const priceInWords = await convertNumberToWords(price);
            const priceInDollars = await convertNumberToDollars(price);

            results.push({
                isbn,
                valid: true,
                price,
                currency,
                priceInWords,
                priceInDollars
            });

        }catch(err){
            console.error("Error", err)
        }
    }

    res.json(results)
});

app.listen(4000, () => {
    console.log(`Server running on http://localhost:4000`);
});
