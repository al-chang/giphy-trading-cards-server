const API_KEY = process.env.GIPHY_API_KEY;

// This is a service that will be used to fetch a random GIF from Giphy
export const getRandomGIFs = async (tag: string) => {
  const response = await fetch(
    `https://api.giphy.com/v1/gifs/random?api_key=${API_KEY}&tag=${tag}&rating=pg13`
  );
  const json = await response.json();
  if (!json) throw new Error("No GIFs found");

  return { gif: json.data.images.original.url, source: json.data.url };
};
