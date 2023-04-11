// This is a service that will be used to fetch a random GIF from Giphy
export const getRandomGIF = async (tag: string): Promise<string> => {
  const response = await fetch(
    `https://api.giphy.com/v1/gifs/random?api_key=${process.env.GIPHY_API_KEY}&tag=${tag}`
  );
  const json = await response.json();
  return json.data.image_url;
};

// Get many random GIFs
export const getManyRandomGIFs = async (
  tag: string,
  count: number
): Promise<string[]> => {
  const response = await fetch(
    `https://api.giphy.com/v1/gifs/random?api_key=${process.env.GIPHY_API_KEY}&tag=${tag}&limit=${count}`
  );
  const json = await response.json();
  return json.data.map((gif: any) => gif.image_url);
};
