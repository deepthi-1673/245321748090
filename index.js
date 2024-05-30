const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const TEST_SERVER_URL = 'http://20.244.56.144/test';

// Companies and categories
const COMPANIES = ["AMZ", "FLP", "SNP", "MYN", "AZO"];
const CATEGORIES = ["Phone", "Computer", "TV", "Earphone", "Tablet", "Charger", "Mouse", "Keypad", "Bluetooth", "Pendrive", "Remote", "Speaker", "Headset", "Laptop", "PC"];

// Bearer token received from the auth request
const BEARER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzE3MDgyNzAzLCJpYXQiOjE3MTcwODI0MDMsImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6ImExMzExNTFiLTZlNjMtNDRiZi04ZjczLTU0NGQ5YmIxMmNmNiIsInN1YiI6ImthcmFuYW1kZWVwdGhpNTlAZ21haWwuY29tIn0sImNvbXBhbnlOYW1lIjoiS01JVCBBZmZvcmRtZWQiLCJjbGllbnRJRCI6ImExMzExNTFiLTZlNjMtNDRiZi04ZjczLTU0NGQ5YmIxMmNmNiIsImNsaWVudFNlY3JldCI6IlpCdmFRZnpPVWFPeFV3Z3kiLCJvd25lck5hbWUiOiJLQVJBTkFNIERFRVBUSEkiLCJvd25lckVtYWlsIjoia2FyYW5hbWRlZXB0aGk1OUBnbWFpbC5jb20iLCJyb2xsTm8iOiIyNDUzMjE3NDgwOTAifQ.ouzS1pHlox9yqRztHKwUUK9Av7NpSg7bx9Rvfd9trzE";

// Helper function to fetch products from all companies
const fetchProductsFromCompanies = async (category, minPrice, maxPrice, top) => {
    const requests = COMPANIES.map(company => {
        const url = `${TEST_SERVER_URL}/companies/${company}/categories/${category}/products`;
        const params = { top, minPrice, maxPrice };
        const headers = { Authorization: `Bearer ${BEARER_TOKEN}` };

        console.log(`Request to ${company}:`, { url, params, headers });

        return axios.get(url, { params, headers })
            .then(response => response.data)
            .catch(error => {
                if (error.response) {
                    console.error(`Error fetching data from ${company}:`, {
                        status: error.response.status,
                        statusText: error.response.statusText,
                        data: error.response.data
                    });
                } else {
                    console.error(`Error fetching data from ${company}:`, error.message);
                }
                return [];
            });
    });
    const results = await Promise.all(requests);
    return results.flat();
};

// Helper function to generate a unique identifier
const generateUniqueId = () => {
    return crypto.randomBytes(16).toString('hex');
};

// Endpoint to get top products in a category
app.get('/categories/:category/products', async (req, res) => {
    const { category } = req.params;
    const { n = 10, minPrice = 0, maxPrice = Infinity, page = 1, sort = '' } = req.query;

    if (!CATEGORIES.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
    }

    const top = parseInt(n);
    const minP = parseFloat(minPrice);
    const maxP = parseFloat(maxPrice);

    try {
        let products = await fetchProductsFromCompanies(category, minP, maxP, top);

        // Add custom unique identifier
        products = products.map(product => ({ ...product, id: generateUniqueId() }));

        // Sorting logic
        if (sort) {
            const [key, order] = sort.split(':');
            products.sort((a, b) => {
                if (a[key] < b[key]) return order === 'desc' ? 1 : -1;
                if (a[key] > b[key]) return order === 'desc' ? -1 : 1;
                return 0;
            });
        }

        // Pagination logic
        const startIndex = (page - 1) * top;
        const endIndex = startIndex + top;
        const paginatedProducts = products.slice(startIndex, endIndex);

        res.json({
            page: parseInt(page),
            totalProducts: products.length,
            totalPages: Math.ceil(products.length / top),
            products: paginatedProducts
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Endpoint to get product details by ID
app.get('/categories/:category/products/:productid', async (req, res) => {
    const { category, productid } = req.params;

    if (!CATEGORIES.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
    }

    const { minPrice = 0, maxPrice = Infinity, top = 100 } = req.query;

    try {
        let products = await fetchProductsFromCompanies(category, parseFloat(minPrice), parseFloat(maxPrice), parseInt(top));

        // Cache unique identifiers
        const productsWithId = products.map(product => ({ ...product, id: generateUniqueId() }));

        // Find the product by unique identifier
        const product = productsWithId.find(product => product.id === productid);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
 
