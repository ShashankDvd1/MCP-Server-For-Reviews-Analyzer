import { forms, drive } from './googleAuth';

export async function createGoogleForm(title: string, description: string, surveyData: any) {
  // 1. Create the base form
  const createRes = await forms.forms.create({
    requestBody: {
      info: {
        title: title,
        documentTitle: title,
      },
    },
  });

  const formId = createRes.data.formId!;
  
  // 2. Prepare batch updates
  const requests: any[] = [];
  
  // Update form description if needed (since create only takes title easily)
  if (description) {
    requests.push({
      updateFormInfo: {
        info: {
          description: description
        },
        updateMask: "description"
      }
    });
  }

  let index = 0;
  
  if (surveyData.sections && Array.isArray(surveyData.sections)) {
    for (const section of surveyData.sections) {
      // Add Section Header (TextItem)
      requests.push({
        createItem: {
          item: {
            title: section.title || "Section",
            description: section.description || "",
            textItem: {}
          },
          location: { index: index++ }
        }
      });
      
      // Add Questions
      if (section.questions && Array.isArray(section.questions)) {
        for (const q of section.questions) {
          const item: any = {
            title: q.title || "Untitled Question"
          };
          
          if (q.type === 'multiple_choice' || q.type === 'checkbox') {
            const options = (q.options || ["Option 1"]).map((opt: string) => ({ value: opt }));
            item.questionItem = {
              question: {
                required: true,
                choiceQuestion: {
                  type: q.type === 'checkbox' ? 'CHECKBOX' : 'RADIO',
                  options: options
                }
              }
            };
          } else if (q.type === 'text' || q.type === 'paragraph') {
            item.questionItem = {
              question: {
                required: true,
                textQuestion: {
                  paragraph: q.type === 'paragraph'
                }
              }
            };
          } else if (q.type === 'scale') {
            item.questionItem = {
              question: {
                required: true,
                scaleQuestion: {
                  low: 1,
                  high: 5
                }
              }
            };
          } else {
            // Default to text
            item.questionItem = {
              question: { required: true, textQuestion: { paragraph: false } }
            };
          }
          
          requests.push({
            createItem: {
              item: item,
              location: { index: index++ }
            }
          });
        }
      }
    }
  }

  // 3. Execute batch update
  if (requests.length > 0) {
    await forms.forms.batchUpdate({
      formId: formId,
      requestBody: {
        requests: requests
      }
    });
  }

  // 4. Make the form accessible (Optional, but good for sharing)
  try {
    await drive.permissions.create({
      fileId: formId,
      requestBody: {
        type: 'anyone',
        role: 'reader', // reader allows them to fill the form
      }
    });
  } catch (e) {
    console.warn("Could not set public permissions on form", e);
  }

  return {
    formId,
    formUrl: `https://docs.google.com/forms/d/${formId}/edit`,
    responderUri: createRes.data.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`
  };
}
