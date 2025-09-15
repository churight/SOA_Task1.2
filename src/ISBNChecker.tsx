import React, { useState } from 'react';
import axios from 'axios';
import "./IsbnChecker.css"

/*interface Book {
  isbn: string;
  price: number;
  countryCode: string;
}*/

interface Result {
  isbn: string;
  valid: boolean;
  price?: number;
  priceInWords?: string;
  currency?: string;
  summary?: string;
  error?: string;
}


const ISBNChecker = () => {
  const [isbn, setIsbn] = useState('');
  const [price, setPrice] = useState('');
  const [country, setCountry] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  /*const handleCheck = async () => {
    try {
      const books: Book[] = booksInput
        .split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .map(line => {
          const [isbn, priceStr, countryCode] = line.split(',').map(s => s.trim());
          return { isbn, price: parseFloat(priceStr), countryCode };
        });

      setLoading(true);
      const res = await axios.post('http://localhost:4000/api/check-books', { books });
      setResults(res.data);
    } catch (err) {
      console.error(err);
      alert('Error fetching results');
    } finally {
      setLoading(false);
    }
  };*/

  const handleCheck = async() =>{
    try{
        setLoading(true);

        const res = await axios.post('http://localhost:4000/api/check-books', {
          isbn,
          price: price ? parseFloat(price): null,
          country: country || null
        })

        setResult(res.data)
    }catch(err){
      console.error(err);
      alert('error fetching results');
    }finally{
      setLoading(false)
    }
  }

  return (
    <div className="checker-container">
      <h1 className="checker-title">ISBN & Book Price Checker</h1>

      <div className="form-group">
        <label>ISBN</label>
        <input
          type="text"
          value={isbn}
          onChange={(e) => setIsbn(e.target.value)}
          placeholder="9783161484100"
        />
      </div>

      <div className="form-group">
        <label>Price</label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="20"
        />
      </div>

      <div className="form-group">
        <label>Country (code or name)</label>
        <input
          type="text"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="FI or Finland"
        />
      </div>

      <button className="check-button" onClick={handleCheck} disabled={loading}>
        {loading ? 'Checking...' : 'Check Book'}
      </button>

      {result && (
        <div className={`result-box ${
          result.error
            ? "error-bg"
            : result.valid
            ? "success-bg"
            : "neutral-bg"
        }`}>
          <h2>Result</h2>
          <p><strong>ISBN:</strong> {result.isbn}</p>
          <p><strong>Valid:</strong> {result.valid ? '✅ Yes' : '❌ No'}</p>
          {result.price && <p><strong>Price:</strong> {result.price}</p>}
          {result.currency && <p><strong>Currency:</strong> {result.currency}</p>}
          {result.priceInWords && <p><strong>Price in Words:</strong> {result.priceInWords}</p>}
        </div>
      )}

      <div className= "summary">
        {result && (
          <div>
          {result.summary && <h3 style={{textAlign: 'center'}}><strong>Summary:</strong> {result.summary}</h3>}
          {result.error && <h3 className="error" style={{textAlign: 'center'}}><strong>Error:</strong> {result.error}</h3>}
          </div>
        )}

      </div>
    </div>
  );
};

export default ISBNChecker;
