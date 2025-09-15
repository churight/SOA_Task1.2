from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from zeep import Client
from pydantic import BaseModel
from typing import Optional

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
    """Якщо ввели код → повертаємо його, якщо назву → шукаємо код"""
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

@app.post('/api/check-books')
async def check_book(book: BookRequest):
    isbn, price, country = book.isbn, book.price, book.country

    try:
        valid = validate_isbn(isbn)
        if not valid:
            return {"isbn": isbn, "valid": False, "error": "Invalid ISBN"}

        if not price or not country:
            return {"isbn": isbn, "valid": True, "summary": f"ISBN {isbn} is valid."}

        country_code = resolve_country_code(country)
        if not country_code:
            return {"isbn": isbn, "valid": True, "error": "Invalid country name/code"}

        currency = get_country_currency(country_code)
        if not currency:
            return {"isbn": isbn, "valid": True, "error": "Could not fetch currency"}

        price_in_words = convert_number_to_words(price)
        summary = f"ISBN {isbn} is valid. Price: {price} {currency} ({price_in_words})"

        return {
            "isbn": isbn,
            "valid": True,
            "price": price,
            "currency": currency,
            "priceInWords": price_in_words,
            "summary": summary
        }

    except Exception as e:
        return {"isbn": isbn, "valid": False, "error": str(e)}
