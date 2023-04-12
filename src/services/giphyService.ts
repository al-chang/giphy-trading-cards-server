const API_KEY = process.env.GIPHY_API_KEY;

// This is a service that will be used to fetch a random GIF from Giphy
export const getRandomGIFs = async (tag: string): Promise<string> => {
  const response = await fetch(
    `https://api.giphy.com/v1/gifs/random?api_key=${API_KEY}&tag=${tag}`
  );
  const json = await response.json();
  return json.data.images.original.url;
};
