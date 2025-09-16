from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from zeep import Client
from pydantic import BaseModel
from typing import Optional
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class BookRequest(BaseModel):
    isbn: str
    price: Optional[float] = None
    country: Optional[str] = None  # може бути код або назва

isbn_service_url = "http://webservices.daehosting.com/services/isbnservice.wso?WSDL"
country_info_wsdl = "http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL"
number_conversion_wsdl = "http://www.dataaccess.com/webservicesserver/numberconversion.wso?WSDL"

isbn_client = Client(isbn_service_url)
country_client = Client(country_info_wsdl)
number_client = Client(number_conversion_wsdl)

def validate_isbn(isbn: str) -> bool:
    if len(isbn) == 10:
        return isbn_client.service.IsValidISBN10(sISBN=isbn)
    elif len(isbn) == 13:
        return isbn_client.service.IsValidISBN13(sISBN=isbn)
    return False

def resolve_country_code(country: str) -> Optional[str]:
    country = country.strip()
    if len(country) == 2:  # вже ISO-код
        return country.upper()
    try:
        result = country_client.service.CountryISOCode(sCountryName=country)
        return result if result else None
    except:
        return None

def get_country_currency(country_code: str) -> Optional[str]:
    result = country_client.service.CountryCurrency(sCountryISOCode=country_code)
    return getattr(result, "sISOCode", None)

def convert_number_to_words(amount: float) -> Optional[str]:
    return number_client.service.NumberToWords(ubiNum=amount)

def get_books_data(isbn: str):
    try:
        url =  f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&jscmd=data&format=json"
        res = requests.get(url, timeout = 5)
        res.raise_for_status()
        data = res.json()

        book = data.get(f"ISBN:{isbn}")
        if not book:
            return {"title": "Unknown", "authors": "Unknown", "publishCountry": "Unknown"}

        authors = ", ".join([a["name"] for a in book.get("authors", [])]) or "Unknown"
        publish_country = book.get("publish_places", [{}])[0].get("name", "Unknown")
        return {
            "title": book.get("title", "Unknown"),
            "authors": authors,
            "publishCountry": publish_country
        }
    except Exception as e:
        print("Error fetching book data:", e)
        return {"title": "Unknown", "authors": "Unknown", "publishCountry": "Unknown"}

@app.post('/check-books')
async def check_book(book: BookRequest):
    isbn, price, country = book.isbn, book.price, book.country

    try:
        valid = validate_isbn(isbn)
        if not valid:
            return {"isbn": isbn, "valid": valid, "error": "Invalid ISBN"}
        
        book_data = get_books_data(isbn)

        if not price or not country:
            return {"isbn": isbn, "valid": valid, **book_data, "summary": f"ISBN {isbn} is valid."}

        country_code = resolve_country_code(country)
        if not country_code:
            return {"isbn": isbn, "valid": valid, **book_data, "error": "Invalid country name/code"}

        currency = get_country_currency(country_code)
        if not currency:
            return {"isbn": isbn, "valid": valid, **book_data, "error": "Could not fetch currency"}

        price_in_words = convert_number_to_words(price)
        summary = f"ISBN {isbn} is valid. Price: {price} {currency} ({price_in_words})"

        return {
            "isbn": isbn,
            "valid": valid,
            "price": price,
            "currency": currency,
            "priceInWords": price_in_words,
            "summary": summary,
            **book_data,
        }

    except Exception as e:
        return {"isbn": isbn, "valid": False, "error": str(e)}
