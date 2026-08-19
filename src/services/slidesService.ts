import { slides, drive } from './googleAuth';

export interface SlideData {
  title: string;
  content: string;
}

export const createGooglePresentation = async (
  title: string,
  slidesData: SlideData[],
  templatePresentationId?: string,
  replacements?: { matchText: string; replaceText: string }[]
) => {
  try {
    let presentationId: string;

    if (templatePresentationId) {
      // 1. Copy the template presentation
      const copyResponse = await drive.files.copy({
        fileId: templatePresentationId,
        requestBody: {
          name: title,
        },
      });
      presentationId = copyResponse.data.id || "";
      if (!presentationId) throw new Error("Failed to copy template presentation.");

      // 2. Perform text replacements if provided
      if (replacements && replacements.length > 0) {
        const replacementRequests = replacements.map((rep) => ({
          replaceAllText: {
            containsText: {
              text: rep.matchText,
              matchCase: true,
            },
            replaceText: rep.replaceText,
          },
        }));

        await slides.presentations.batchUpdate({
          presentationId,
          requestBody: { requests: replacementRequests },
        });
      }

      // Generate the edit URL
      const presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;

      return {
        presentationId,
        presentationUrl,
      };
    }

    // 1. Create a blank presentation (Fallback)
    const presentation = await slides.presentations.create({
      requestBody: {
        title: title,
      },
    });

    presentationId = presentation.data.presentationId || "";
    if (!presentationId) throw new Error("Failed to create presentation: No presentation ID returned.");

    // The first slide is usually the TITLE slide created automatically.
    // Let's get the presentation to find the object IDs of the first slide.
    let getPres = await slides.presentations.get({ presentationId });
    let existingSlides = getPres.data.slides || [];

    const requests: any[] = [];

    // If there's a default first slide, we can set its title.
    if (existingSlides.length > 0 && slidesData.length > 0) {
      const firstSlide = existingSlides[0];
      const pageElements = firstSlide.pageElements || [];
      
      // Identify Title placeholder
      const titleShape = pageElements.find(el => el.shape?.placeholder?.type === 'CENTERED_TITLE' || el.shape?.placeholder?.type === 'TITLE');
      const subtitleShape = pageElements.find(el => el.shape?.placeholder?.type === 'SUBTITLE');

      if (titleShape && titleShape.objectId) {
        requests.push({
          insertText: {
            objectId: titleShape.objectId,
            text: slidesData[0].title,
          }
        });
      }
      if (subtitleShape && subtitleShape.objectId) {
        requests.push({
          insertText: {
            objectId: subtitleShape.objectId,
            text: slidesData[0].content,
          }
        });
      }
    }

    // For the remaining slides, create new slides with TITLE_AND_BODY layout
    for (let i = 1; i < slidesData.length; i++) {
      const newSlideId = `slide_${i}_${Date.now()}`;
      
      // Request to create the slide
      requests.push({
        createSlide: {
          objectId: newSlideId,
          slideLayoutReference: {
            predefinedLayout: 'TITLE_AND_BODY'
          }
        }
      });
    }

    // Execute the slide creation and first slide text insertion
    if (requests.length > 0) {
      await slides.presentations.batchUpdate({
        presentationId,
        requestBody: { requests },
      });
    }

    // Now we need to fetch the presentation again to get the object IDs of the newly created placeholders
    getPres = await slides.presentations.get({ presentationId });
    existingSlides = getPres.data.slides || [];
    const textRequests: any[] = [];

    // Loop through the slides again to populate the newly created ones
    for (let i = 1; i < slidesData.length; i++) {
      const slideNode = existingSlides[i];
      if (!slideNode) continue;

      const pageElements = slideNode.pageElements || [];
      const titleShape = pageElements.find(el => el.shape?.placeholder?.type === 'TITLE');
      const bodyShape = pageElements.find(el => el.shape?.placeholder?.type === 'BODY');

      if (titleShape && titleShape.objectId) {
        textRequests.push({
          insertText: {
            objectId: titleShape.objectId,
            text: slidesData[i].title,
          }
        });
      }
      
      if (bodyShape && bodyShape.objectId) {
        textRequests.push({
          insertText: {
            objectId: bodyShape.objectId,
            text: slidesData[i].content,
          }
        });
      }
    }

    // Execute text insertion for the rest of the slides
    if (textRequests.length > 0) {
      await slides.presentations.batchUpdate({
        presentationId,
        requestBody: { requests: textRequests },
      });
    }

    // Generate the edit URL
    const presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;

    return {
      presentationId,
      presentationUrl,
    };
  } catch (error) {
    console.error("Error creating Google Presentation:", error);
    throw error;
  }
};
