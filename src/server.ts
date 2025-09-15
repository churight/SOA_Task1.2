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

async function resolveCountryCode(countryName: string) {
    try {
        const client = await soap.createClientAsync(countryInfoWsdl);
        const [response] = await client.CountryISOCodeAsync({ sCountryName: countryName });
        return response?.CountryISOCodeResult ?? null;
    } catch (err) {
        console.error("CountryInfo SOAP error:", err);
        return null;
    }
}


app.post("/api/check-books", async (req, res) => {
    const {isbn, price, country} = req.body;

        try{
            const valid = await validateISBN(isbn);
            if(!valid) return res.json({isbn, valid: 'false', error: "Invalid isbn"})
            
            if(!price || !country){
                return res.json({
                    isbn, 
                    valid: valid,
                    summary: `Isbn ${isbn} is valid`
                })
            }

            const countryCode = await resolveCountryCode(country);
            if(!countryCode) return res.json({
                isbn, 
                valid: valid,
                error: "invalid country name/code"
            })

            const currency = await getCountryCurrency(countryCode);
            if (!currency) {
                return res.json({
                    isbn,
                    valid: valid,
                    error: "Could not fetch currency"
                });
            }

            const priceInWords = await convertNumberToWords(price);
            const priceInDollars = await convertNumberToDollars(price);

            const summary = `ISBN ${isbn} is valid. Price: ${price} ${currency} (${priceInWords})`;

            return res.json({
                isbn,
                valid: valid,
                price,
                currency,
                priceInWords,
                priceInDollars,
                summary
            });
        }catch(err: any){
            console.error(err);
            return res.json({ isbn, valid: false, error: err.message || "Unknown error" });
        }
    }
)

app.listen(4000, () => {
    console.log(`Server running on http://localhost:4000`);
});
